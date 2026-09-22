import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Pool } from 'mysql2/promise';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { jwtVerify } from 'jose';
import { AppModule } from '../../app.module';
import { API_GLOBAL_PREFIX } from './route-prefixes';
import { criarMysqlPool } from '../../infrastructure/mysql/mysql-client.factory';
import { MySqlOperadoresRepository } from '../../infrastructure/mysql/operadores.repository';
import { carregarMysqlTestEnv } from '../../infrastructure/test-support/mysql-test-env';
import { carregarAuthJwtEnv } from '../../infrastructure/config/auth-jwt-env';

/**
 * Teste e2e REAL de `POST /api/auth/login` (PLAN.md, tarefa
 * `ajustes/migracao-mysql-modulo-auth-proprio`) — e do `AuthGuard` que aceita
 * o token que essa rota emite (tarefa `ajustes/migracao-mysql-cutover-
 * wiring`, que fundiu este arquivo com o antigo `auth.e2e.test.ts`).
 *
 * **Fusão deliberada de `auth.e2e.test.ts` neste arquivo** (decisão desta
 * tarefa, registrada também no PR): antes do corte, os dois arquivos
 * cobriam a mesma jornada por caminhos diferentes — `auth.e2e.test.ts` subia
 * `AppModule` inteiro só para provar que `AuthGuard` aceitava um token real;
 * este arquivo subia só `AuthLoginModule` para provar que
 * `POST /api/auth/login` emitia um token válido. Com o corte, as duas
 * metades da mesma jornada (emitir token → guard aceitar esse token) são a
 * mesma prova de ponta a ponta e usam a MESMA infraestrutura (`AppModule`
 * completo, MySQL real) — mantê-las em dois arquivos duplicaria o
 * `beforeAll`/`afterAll` de criação de operador sem
 * nenhum ganho de isolamento real (G5/DRY de `references/clean-code.md`).
 *
 * Operador de teste criado via `MySqlOperadoresRepository.criar` (MySQL real
 * do compose, nunca mock, nunca Admin API de terceiro) — prova de ponta a
 * ponta: criar conta → logar com senha correta (200 + JWT decodificável,
 * `sub` = id do operador, `ultimo_login_em` gravado) → logar com senha errada
 * (401) → logar com e-mail inexistente (401, mesma mensagem da senha errada)
 * → usar o `accessToken` emitido para acessar uma rota administrativa real
 * (`GET /api/admin/sections`) protegida por `AuthGuard`.
 */
describe('Autenticação própria (e2e) — POST /api/auth/login + AuthGuard em /api/admin/*', () => {
  const email = `operador.login.e2e.${randomUUID()}@example.com`;
  const senha = 'senha-de-teste-123456';

  let app: INestApplication;
  let pool: Pool;
  let operadoresRepository: MySqlOperadoresRepository;
  let operadorId: string;
  let accessToken: string;

  beforeAll(async () => {
    pool = criarMysqlPool(carregarMysqlTestEnv());
    operadoresRepository = new MySqlOperadoresRepository(pool);

    const operador = await operadoresRepository.criar({ email, senha, nome: 'Operador E2E' });
    operadorId = operador.id;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_GLOBAL_PREFIX);
    await app.init();

    const login = await request(app.getHttpServer()).post('/api/auth/login').send({ email, senha });
    accessToken = login.body.accessToken;
  }, 20_000);

  afterAll(async () => {
    await app.close();
    if (operadorId) {
      await operadoresRepository.remover(operadorId);
    }
    await pool.end();
  }, 20_000);

  describe('POST /api/auth/login', () => {
    it('200 + accessToken válido (sub = id do operador) com e-mail e senha corretos; grava ultimo_login_em', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, senha });

      expect(resposta.status).toBe(200);
      expect(typeof resposta.body.accessToken).toBe('string');

      const authEnv = carregarAuthJwtEnv();
      const { payload } = await jwtVerify(
        resposta.body.accessToken,
        new TextEncoder().encode(authEnv.secret),
      );
      expect(payload.sub).toBe(operadorId);
      expect(payload.email).toBe(email);

      const credenciais = await operadoresRepository.buscarPorEmail(email);
      expect(credenciais?.operador.ultimoLoginEm).toBeTruthy();
    });

    it('401 com senha errada', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, senha: 'senha-errada-123456' });

      expect(resposta.status).toBe(401);
    });

    it('401 — MESMA resposta da senha errada — com e-mail inexistente', async () => {
      const respostaSenhaErrada = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email, senha: 'senha-errada-123456' });
      const respostaEmailInexistente = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: `nao.existe.${randomUUID()}@example.com`, senha });

      expect(respostaEmailInexistente.status).toBe(401);
      expect(respostaEmailInexistente.status).toBe(respostaSenhaErrada.status);
      expect(respostaEmailInexistente.body).toEqual(respostaSenhaErrada.body);
    });

    it('422 quando o corpo está incompleto (sem senha)', async () => {
      const resposta = await request(app.getHttpServer()).post('/api/auth/login').send({ email });

      expect(resposta.status).toBe(422);
      expect(resposta.body.erros).toBeDefined();
    });
  });

  describe('AuthGuard (/api/admin/*) aceitando o token emitido por POST /api/auth/login', () => {
    it('GET /api/health responde 200 sem qualquer header de autenticação (rota fora do guard)', async () => {
      await request(app.getHttpServer()).get('/api/health').expect(200);
    });

    it('rejeita GET /api/admin/sections sem header Authorization', async () => {
      const resposta = await request(app.getHttpServer()).get('/api/admin/sections');
      expect(resposta.status).toBe(401);
    });

    it('rejeita GET /api/admin/sections com token de assinatura adulterada', async () => {
      const partes = accessToken.split('.');
      const assinaturaAdulterada = partes[2].slice(0, -4) + 'AAAA';
      const tokenAdulterado = `${partes[0]}.${partes[1]}.${assinaturaAdulterada}`;

      const resposta = await request(app.getHttpServer())
        .get('/api/admin/sections')
        .set('Authorization', `Bearer ${tokenAdulterado}`);

      expect(resposta.status).toBe(401);
    });

    it('rejeita GET /API/Admin/sections (variação de maiúsculas/minúsculas) sem header Authorization', async () => {
      // Regressão: o Express (base de `@nestjs/platform-express`) tem
      // `case sensitive routing` desabilitado por padrão — esta requisição é
      // roteada ao mesmo `ContentAdminController` de `/api/admin/sections`, só
      // que com `request.path` preservando a capitalização original do
      // cliente. O guard precisa reconhecer isso como rota administrativa
      // mesmo assim (ver `AuthGuard.ehRotaAdministrativa`).
      const resposta = await request(app.getHttpServer()).get('/API/Admin/sections');
      expect(resposta.status).toBe(401);
    });

    it('aceita GET /api/admin/sections com um JWT válido, emitido por POST /api/auth/login', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/api/admin/sections')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(resposta.status).toBe(200);
      expect(Array.isArray(resposta.body)).toBe(true);
    });
  });
});
