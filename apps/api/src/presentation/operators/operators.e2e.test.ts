import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Pool } from 'mysql2/promise';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../app.module';
import { criarMysqlPool } from '../../infrastructure/mysql/mysql-client.factory';
import { MySqlOperadoresRepository } from '../../infrastructure/mysql/operadores.repository';
import { carregarMysqlTestEnv } from '../../infrastructure/test-support/mysql-test-env';
import { criarOperadorAutenticadoDeTeste } from '../../infrastructure/test-support/operador-teste';
import { API_GLOBAL_PREFIX } from '../auth/route-prefixes';

/**
 * Teste e2e REAL da tarefa `ajustes/modulo-operadores`: sobe a aplicação Nest
 * completa (`AppModule`) via `@nestjs/testing` + `supertest`, contra o
 * `mysql` REAL do compose — operador e login reais via
 * `POST /api/auth/login`, sem mock.
 *
 * **Sobre o ramo `'ultimo-operador'` de `RemoverOperadorUseCase`:** não é
 * exercitado aqui de propósito. Como o comentário da classe explica, ele só é
 * alcançável quando o alvo de remoção é diferente de quem chama E a listagem
 * completa de operadores tem tamanho 1 — mas quem chama só tem um JWT válido
 * se é, ele mesmo, um operador existente, então essa combinação é
 * inatingível via HTTP real (o caso `'proprio'` sempre intercepta primeiro
 * quando só resta o próprio chamador). O ramo é coberto isoladamente em
 * `application/operators/remover-operador.use-case.test.ts`, com um
 * repositório falso que consegue construir esse estado.
 */
describe('Operators (e2e) — GET/POST/DELETE /api/admin/operators', () => {
  const email = `operador.operators.e2e.${randomUUID()}@example.com`;
  const senha = 'senha-de-teste-123456';

  let app: INestApplication;
  let pool: Pool;
  let operadoresRepository: MySqlOperadoresRepository;
  let operadorId: string;
  let accessToken: string;
  /** Operadores extras criados por um teste — removidos em `afterEach` para nenhum vazar entre execuções locais. */
  const idsCriadosNoTeste: string[] = [];

  const authHeader = () => `Bearer ${accessToken}`;

  beforeAll(async () => {
    pool = criarMysqlPool(carregarMysqlTestEnv());
    operadoresRepository = new MySqlOperadoresRepository(pool);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_GLOBAL_PREFIX);
    await app.init();

    const auth = await criarOperadorAutenticadoDeTeste(app, operadoresRepository, { email, senha });
    operadorId = auth.operadorId;
    accessToken = auth.accessToken;
  }, 20_000);

  afterEach(async () => {
    while (idsCriadosNoTeste.length > 0) {
      const id = idsCriadosNoTeste.pop();
      if (id) {
        await operadoresRepository.remover(id).catch(() => undefined);
      }
    }
  });

  afterAll(async () => {
    await app.close();
    if (operadorId) {
      await operadoresRepository.remover(operadorId);
    }
    await pool.end();
  }, 20_000);

  describe('autenticação das rotas administrativas', () => {
    it('rejeita GET /api/admin/operators sem token', async () => {
      await request(app.getHttpServer()).get('/api/admin/operators').expect(401);
    });

    it('rejeita POST /api/admin/operators sem token', async () => {
      await request(app.getHttpServer())
        .post('/api/admin/operators')
        .send({ email: 'sem-token@example.com', senha: 'senha-123456', nome: 'Sem Token' })
        .expect(401);
    });
  });

  describe('POST /api/admin/operators — validação', () => {
    it('recusa email inválido com 422 e a lista de erros', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/api/admin/operators')
        .set('Authorization', authHeader())
        .send({ email: 'não-é-um-email', senha: 'senha-valida-123', nome: 'Alguém' });

      expect(resposta.status).toBe(422);
      expect(Array.isArray(resposta.body.erros)).toBe(true);
      expect(resposta.body.erros.some((erro: { campo: string }) => erro.campo === 'email')).toBe(
        true,
      );
    });

    it('recusa senha com menos de 6 caracteres com 422', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/api/admin/operators')
        .set('Authorization', authHeader())
        .send({ email: `curta.${randomUUID()}@example.com`, senha: '123', nome: 'Alguém' });

      expect(resposta.status).toBe(422);
      expect(resposta.body.erros.some((erro: { campo: string }) => erro.campo === 'senha')).toBe(
        true,
      );
    });

    it('recusa nome vazio com 422', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/api/admin/operators')
        .set('Authorization', authHeader())
        .send({ email: `sem-nome.${randomUUID()}@example.com`, senha: 'senha-valida-123', nome: '   ' });

      expect(resposta.status).toBe(422);
      expect(resposta.body.erros.some((erro: { campo: string }) => erro.campo === 'nome')).toBe(
        true,
      );
    });
  });

  describe('POST /api/admin/operators → GET /api/admin/operators', () => {
    it('cria um operador com sucesso, já pronto para logar, e o lista mais recente primeiro', async () => {
      const emailNovo = `operador.criado.e2e.${randomUUID()}@example.com`;
      const senhaNova = 'senha-nova-123456';
      const respostaCriacao = await request(app.getHttpServer())
        .post('/api/admin/operators')
        .set('Authorization', authHeader())
        .send({ email: emailNovo, senha: senhaNova, nome: 'Novo Operador' });

      expect(respostaCriacao.status).toBe(201);
      expect(respostaCriacao.body.email).toBe(emailNovo);
      expect(respostaCriacao.body.nome).toBe('Novo Operador');
      expect(respostaCriacao.body.ultimoLoginEm).toBeNull();
      expect(typeof respostaCriacao.body.id).toBe('string');
      idsCriadosNoTeste.push(respostaCriacao.body.id);

      // "Já pronto para logar, sem confirmação adicional": login real com a
      // senha recém-definida via POST /api/auth/login.
      const login = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: emailNovo, senha: senhaNova });
      expect(login.status).toBe(200);
      expect(typeof login.body.accessToken).toBe('string');

      const respostaListagem = await request(app.getHttpServer())
        .get('/api/admin/operators')
        .set('Authorization', authHeader());
      expect(respostaListagem.status).toBe(200);
      expect(
        respostaListagem.body[0].id === respostaCriacao.body.id ||
          respostaListagem.body.some((operador: { id: string }) => operador.id === respostaCriacao.body.id),
      ).toBe(true);
    });
  });

  describe('DELETE /api/admin/operators/:id', () => {
    it('remove um operador com sucesso', async () => {
      const emailParaRemover = `operador.remover.e2e.${randomUUID()}@example.com`;
      const respostaCriacao = await request(app.getHttpServer())
        .post('/api/admin/operators')
        .set('Authorization', authHeader())
        .send({ email: emailParaRemover, senha: 'senha-para-remover-123', nome: 'Para Remover' });
      const idParaRemover = respostaCriacao.body.id;

      await request(app.getHttpServer())
        .delete(`/api/admin/operators/${idParaRemover}`)
        .set('Authorization', authHeader())
        .expect(204);

      const respostaListagem = await request(app.getHttpServer())
        .get('/api/admin/operators')
        .set('Authorization', authHeader());
      expect(
        respostaListagem.body.some((operador: { id: string }) => operador.id === idParaRemover),
      ).toBe(false);
    });

    it('recusa remover a própria conta com 409', async () => {
      const resposta = await request(app.getHttpServer())
        .delete(`/api/admin/operators/${operadorId}`)
        .set('Authorization', authHeader());

      expect(resposta.status).toBe(409);
      expect(resposta.body.message).toContain('própria conta');
    });

    it('recusa remover um id inexistente com 404', async () => {
      await request(app.getHttpServer())
        .delete(`/api/admin/operators/${randomUUID()}`)
        .set('Authorization', authHeader())
        .expect(404);
    });
  });
});
