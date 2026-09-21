import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Pool } from 'mysql2/promise';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { jwtVerify } from 'jose';
import { AuthLoginModule } from './auth-login.module';
import { API_GLOBAL_PREFIX } from './route-prefixes';
import { criarMysqlPool } from '../../infrastructure/mysql/mysql-client.factory';
import { MySqlOperadoresRepository } from '../../infrastructure/mysql/operadores.repository';
import { carregarMysqlTestEnv } from '../../infrastructure/test-support/mysql-test-env';
import { carregarAuthJwtEnv } from '../../infrastructure/config/auth-jwt-env';

/**
 * Teste e2e REAL de `POST /api/auth/login` (PLAN.md, tarefa
 * `ajustes/migracao-mysql-modulo-auth-proprio`) — sobe só `AuthLoginModule`
 * (não `AppModule` inteiro, ver comentário de decisão naquele módulo:
 * `AppModule` ainda serve `content`/`media`/`leads`/`metadata`/`operators`
 * inteiramente por Supabase, e não há motivo para acoplar este teste a isso)
 * via `@nestjs/testing` + `supertest` — mesmo padrão de `auth.e2e.test.ts`.
 *
 * Operador de teste criado via `MySqlOperadoresRepository.criar` (MySQL real
 * do compose, nunca mock) — prova de ponta a ponta: criar conta → logar com
 * senha correta (200 + JWT decodificável, `sub` = id do operador,
 * `ultimo_login_em` gravado) → logar com senha errada (401) → logar com
 * e-mail inexistente (401, mesma mensagem da senha errada).
 */
describe('POST /api/auth/login (e2e)', () => {
  const email = `operador.login.e2e.${randomUUID()}@example.com`;
  const senha = 'senha-de-teste-123456';

  let app: INestApplication;
  let pool: Pool;
  let operadoresRepository: MySqlOperadoresRepository;
  let operadorId: string;

  beforeAll(async () => {
    pool = criarMysqlPool(carregarMysqlTestEnv());
    operadoresRepository = new MySqlOperadoresRepository(pool);

    const operador = await operadoresRepository.criar({ email, senha, nome: 'Operador E2E' });
    operadorId = operador.id;

    const moduleRef = await Test.createTestingModule({ imports: [AuthLoginModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_GLOBAL_PREFIX);
    await app.init();
  }, 20_000);

  afterAll(async () => {
    await app.close();
    if (operadorId) {
      await operadoresRepository.remover(operadorId);
    }
    await pool.end();
  }, 20_000);

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
