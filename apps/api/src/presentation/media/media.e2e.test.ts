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
import { API_GLOBAL_PREFIX } from '../auth/route-prefixes';

/**
 * Teste e2e REAL da tarefa `api/modulo-media`: sobe a aplicação Nest
 * completa (`AppModule`) via `@nestjs/testing` + `supertest`, mesmo padrão de
 * `presentation/metadata/metadata.e2e.test.ts`, contra o Supabase LOCAL de
 * verdade (`npx supabase start`), incluindo o Storage local — usuário e
 * login reais.
 *
 * `POST /api/admin/media/upload-url` é a ÚNICA rota deste módulo (SDD
 * § Contratos de dados/API/interfaces): não cria linha em `media_assets`,
 * só reserva o `mediaAssetId`/`storagePath` e emite a credencial de upload
 * direto ao Storage — por isso não há nada para restaurar em `afterAll` no
 * banco (mesmo comportamento já coberto, ao nível de repositório, por
 * `infrastructure/supabase/media-assets.repository.test.ts`: nenhuma linha
 * nasce em `media_assets` antes da confirmação pós-upload, que este módulo
 * não expõe por rota própria — ver nota de decisão em
 * `media-admin.controller.ts`).
 */
describe('Media (e2e) — POST /api/admin/media/upload-url', () => {
  const email = `operador.media.e2e.${randomUUID()}@example.com`;
  const senha = 'senha-de-teste-123456';

  let app: INestApplication;
  let adminClient: SupabaseClient;
  let bucket: string;
  let userId: string;
  let accessToken: string;
  const caminhosParaLimpar: string[] = [];

  const authHeader = () => `Bearer ${accessToken}`;

  beforeAll(async () => {
    const env = carregarSupabaseTestEnv();
    adminClient = criarSupabaseAdminClient(env);
    bucket = env.storageBucket;
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
    if (caminhosParaLimpar.length > 0) {
      await adminClient.storage.from(bucket).remove(caminhosParaLimpar);
    }
    await app.close();
    if (userId) {
      await adminClient.auth.admin.deleteUser(userId);
    }
  });

  it('rejeita POST /api/admin/media/upload-url sem token', async () => {
    await request(app.getHttpServer())
      .post('/api/admin/media/upload-url')
      .send({ originalFilename: 'selo.png', mimeType: 'image/png' })
      .expect(401);
  });

  it('recusa com 422 um mimeType que não é de imagem (ex.: vídeo, fora de escopo)', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/api/admin/media/upload-url')
      .set('Authorization', authHeader())
      .send({ originalFilename: 'demo.mp4', mimeType: 'video/mp4' });

    expect(resposta.status).toBe(422);
    expect(Array.isArray(resposta.body.erros)).toBe(true);
    expect(resposta.body.erros.some((erro: { campo: string }) => erro.campo === 'mimeType')).toBe(
      true,
    );
  });

  it('recusa com 422 um originalFilename vazio', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/api/admin/media/upload-url')
      .set('Authorization', authHeader())
      .send({ originalFilename: '   ', mimeType: 'image/png' });

    expect(resposta.status).toBe(422);
    expect(
      resposta.body.erros.some((erro: { campo: string }) => erro.campo === 'originalFilename'),
    ).toBe(true);
  });

  it('com um corpo válido, devolve a credencial de upload + o id reservado, e a credencial funciona contra o Storage local', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/api/admin/media/upload-url')
      .set('Authorization', authHeader())
      .send({ originalFilename: 'selo-eficacia.png', mimeType: 'image/png' });

    expect(resposta.status).toBe(201);
    expect(resposta.body.mediaAssetId).toBeTruthy();
    expect(resposta.body.storagePath).toBe(`${resposta.body.mediaAssetId}.png`);
    expect(resposta.body.signedUrl).toBeTruthy();
    expect(resposta.body.token).toBeTruthy();

    // Nenhuma linha nasce em `media_assets` só por emitir a credencial (SDD
    // § Riscos técnicos — upload interrompido não pode deixar referência a
    // um arquivo inexistente): esta rota não confirma upload nenhum.
    const { data: linhaAntesDoUpload } = await adminClient
      .from('media_assets')
      .select('id')
      .eq('id', resposta.body.mediaAssetId)
      .maybeSingle();
    expect(linhaAntesDoUpload).toBeNull();

    // Exercita a credencial contra o Storage local de verdade — prova que o
    // que a rota devolve é utilizável pelo navegador, mesmo caminho que
    // `infrastructure/supabase/media-assets.repository.test.ts` já exercita
    // no nível do repositório.
    caminhosParaLimpar.push(resposta.body.storagePath);
    const bytesDePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    const { error: erroUpload } = await adminClient.storage
      .from(bucket)
      .uploadToSignedUrl(resposta.body.storagePath, resposta.body.token, bytesDePng, {
        contentType: 'image/png',
      });
    expect(erroUpload).toBeNull();
  });
});
