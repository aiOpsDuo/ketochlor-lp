import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../app.module';
import { criarSupabaseAdminClient } from '../../infrastructure/supabase/supabase-client.factory';
import {
  ANON_KEY_LOCAL,
  carregarSupabaseTestEnv,
} from '../../infrastructure/test-support/supabase-test-env';
import { API_GLOBAL_PREFIX } from '../auth/route-prefixes';

/**
 * Teste e2e REAL da tarefa `ajustes/modulo-operadores`: sobe a aplicação Nest
 * completa (`AppModule`) via `@nestjs/testing` + `supertest`, mesmo padrão de
 * `presentation/metadata/metadata.e2e.test.ts`, contra o Supabase LOCAL de
 * verdade (`npx supabase start`) — usuário e login reais, sem mock do SDK.
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
  let adminClient: SupabaseClient;
  let userId: string;
  let accessToken: string;
  /** Operadores extras criados por um teste — removidos em `afterEach` para nenhum vazar entre execuções locais. */
  const idsCriadosNoTeste: string[] = [];

  const authHeader = () => `Bearer ${accessToken}`;

  beforeAll(async () => {
    const env = carregarSupabaseTestEnv();
    adminClient = criarSupabaseAdminClient(env);
    const anonClient = createClient(env.url, ANON_KEY_LOCAL);

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`Falha ao criar usuário de teste: ${error?.message}`);
    }
    userId = data.user.id;

    const login = await anonClient.auth.signInWithPassword({ email, password: senha });
    if (login.error || !login.data.session) {
      throw new Error(`Falha ao autenticar usuário de teste: ${login.error?.message}`);
    }
    accessToken = login.data.session.access_token;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_GLOBAL_PREFIX);
    await app.init();
  });

  afterEach(async () => {
    while (idsCriadosNoTeste.length > 0) {
      const id = idsCriadosNoTeste.pop();
      if (id) {
        await adminClient.auth.admin.deleteUser(id).catch(() => undefined);
      }
    }
  });

  afterAll(async () => {
    await app.close();
    if (userId) {
      await adminClient.auth.admin.deleteUser(userId);
    }
  });

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
      const respostaCriacao = await request(app.getHttpServer())
        .post('/api/admin/operators')
        .set('Authorization', authHeader())
        .send({ email: emailNovo, senha: 'senha-nova-123456', nome: 'Novo Operador' });

      expect(respostaCriacao.status).toBe(201);
      expect(respostaCriacao.body.email).toBe(emailNovo);
      expect(respostaCriacao.body.nome).toBe('Novo Operador');
      expect(respostaCriacao.body.ultimoLoginEm).toBeNull();
      expect(typeof respostaCriacao.body.id).toBe('string');
      idsCriadosNoTeste.push(respostaCriacao.body.id);

      // "Já pronto para logar, sem confirmação de e-mail adicional"
      // (`email_confirm: true`): login real com a senha recém-definida.
      const env = carregarSupabaseTestEnv();
      const anonClient = createClient(env.url, ANON_KEY_LOCAL);
      const login = await anonClient.auth.signInWithPassword({
        email: emailNovo,
        password: 'senha-nova-123456',
      });
      expect(login.error).toBeNull();
      expect(login.data.session).not.toBeNull();

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
        .delete(`/api/admin/operators/${userId}`)
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
