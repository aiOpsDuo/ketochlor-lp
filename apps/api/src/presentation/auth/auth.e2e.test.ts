import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../app.module';
import { criarSupabaseAdminClient } from '../../infrastructure/supabase/supabase-client.factory';
import {
  ANON_KEY_LOCAL,
  carregarSupabaseTestEnv,
} from '../../infrastructure/test-support/supabase-test-env';
import { API_GLOBAL_PREFIX } from './route-prefixes';

/**
 * Teste e2e REAL da tarefa `api/modulo-auth`: sobe a aplicação Nest completa
 * (`AppModule`, com `AuthGuard` já registrado globalmente) via
 * `Test.createTestingModule` + `supertest` (forma confirmada via Context7 —
 * docs.nestjs.com § "End-to-end testing") e verifica o guard de ponta a ponta
 * contra o Supabase local de verdade — mesmo padrão de
 * `infrastructure/auth/jwks-token-verificador.test.ts` (tarefa
 * `api/infra-supabase-adapters`): usuário e login reais via Admin API/Auth do
 * Supabase local, nunca um token fabricado à mão para o caminho feliz.
 *
 * Usa `GET /api/admin/sections` (tarefa `api/modulo-content`) como rota
 * administrativa real de exercício do guard — o `AdminPingController` de
 * exemplo desta tarefa foi removido assim que o primeiro módulo real de
 * admin passou a existir (ver comentário de descartabilidade que ele
 * carregava). A prova de que `request.usuario` chega preenchido às camadas
 * de baixo fica no e2e do próprio módulo de conteúdo
 * (`presentation/content/content.e2e.test.ts`, via `updatedBy` refletido em
 * `PUT /api/admin/sections/:key`) — não é responsabilidade deste arquivo.
 */
describe('AuthGuard (e2e) — /api/admin/*', () => {
  const email = `operador.e2e.${randomUUID()}@example.com`;
  const senha = 'senha-de-teste-123456';

  let app: INestApplication;
  let adminClient: SupabaseClient;
  let userId: string;
  let accessToken: string;

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

  afterAll(async () => {
    await app.close();
    if (userId) {
      await adminClient.auth.admin.deleteUser(userId);
    }
  });

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
    // mesmo assim (ver `AuthGuard.ehRotaAdministrativa`); antes da correção,
    // essa variação de capitalização driblava o guard e a rota respondia sem
    // token.
    const resposta = await request(app.getHttpServer()).get('/API/Admin/sections');
    expect(resposta.status).toBe(401);
  });

  it('aceita GET /api/admin/sections com um JWT válido, emitido pelo Supabase Auth local via login real', async () => {
    const resposta = await request(app.getHttpServer())
      .get('/api/admin/sections')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(resposta.status).toBe(200);
    expect(Array.isArray(resposta.body)).toBe(true);
  });
});
