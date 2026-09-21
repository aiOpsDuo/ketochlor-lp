import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DeleteObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../../app.module';
import { criarMinioClient } from '../../infrastructure/minio/minio-client.factory';
import { criarMysqlPool } from '../../infrastructure/mysql/mysql-client.factory';
import { MySqlOperadoresRepository } from '../../infrastructure/mysql/operadores.repository';
import { carregarMinioTestEnv } from '../../infrastructure/test-support/minio-test-env';
import { carregarMysqlTestEnv } from '../../infrastructure/test-support/mysql-test-env';
import { criarOperadorAutenticadoDeTeste } from '../../infrastructure/test-support/operador-teste';
import { API_GLOBAL_PREFIX } from '../auth/route-prefixes';

/**
 * Teste e2e REAL da tarefa `api/modulo-media`: sobe a aplicação Nest
 * completa (`AppModule`) via `@nestjs/testing` + `supertest`, contra o
 * `minio`+`mysql` REAIS do compose (tarefa `ajustes/migracao-mysql-cutover-
 * wiring`, que substitui o Supabase local/`SupabaseMediaAssetsRepository`
 * deste arquivo) — operador e login reais via `POST /api/auth/login`.
 *
 * `POST /api/admin/media/upload-url` é a ÚNICA rota deste módulo (SDD
 * § Contratos de dados/API/interfaces): não cria linha em `media_assets`,
 * só reserva o `mediaAssetId`/`storagePath` e emite a credencial de upload
 * direto ao Storage — por isso não há nada para restaurar no banco (mesmo
 * comportamento já coberto, ao nível de repositório, por
 * `infrastructure/minio/media-assets.repository.test.ts`). O `PUT` do
 * arquivo de teste contra a `signedUrl` usa `fetch` nativo do Node, sem SDK
 * cliente — simulando exatamente o que o navegador do painel fará (tarefa
 * futura `migracao-mysql-painel-auth-e-upload`).
 */
describe('Media (e2e) — POST /api/admin/media/upload-url', () => {
  const email = `operador.media.e2e.${randomUUID()}@example.com`;
  const senha = 'senha-de-teste-123456';

  let app: INestApplication;
  let pool: Pool;
  let s3Client: S3Client;
  let bucket: string;
  let operadoresRepository: MySqlOperadoresRepository;
  let operadorId: string;
  let accessToken: string;
  const caminhosParaLimpar: string[] = [];

  const authHeader = () => `Bearer ${accessToken}`;

  beforeAll(async () => {
    pool = criarMysqlPool(carregarMysqlTestEnv());
    operadoresRepository = new MySqlOperadoresRepository(pool);
    const minioEnv = carregarMinioTestEnv();
    s3Client = criarMinioClient(minioEnv);
    bucket = minioEnv.bucket;

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_GLOBAL_PREFIX);
    await app.init();

    const auth = await criarOperadorAutenticadoDeTeste(app, operadoresRepository, { email, senha });
    operadorId = auth.operadorId;
    accessToken = auth.accessToken;
  }, 20_000);

  afterAll(async () => {
    await Promise.all(
      caminhosParaLimpar.map((storagePath) =>
        s3Client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storagePath })),
      ),
    );
    await app.close();
    if (operadorId) {
      await operadoresRepository.remover(operadorId);
    }
    s3Client.destroy();
    await pool.end();
  }, 20_000);

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

  it('com um corpo válido, devolve a credencial de upload + o id reservado, e a credencial funciona contra o MinIO real', async () => {
    const resposta = await request(app.getHttpServer())
      .post('/api/admin/media/upload-url')
      .set('Authorization', authHeader())
      .send({ originalFilename: 'selo-eficacia.png', mimeType: 'image/png' });

    expect(resposta.status).toBe(201);
    expect(resposta.body.mediaAssetId).toBeTruthy();
    expect(resposta.body.storagePath).toBe(`${resposta.body.mediaAssetId}.png`);
    expect(resposta.body.signedUrl).toBeTruthy();
    // Diferença deliberada do adaptador Supabase — uma URL pré-assinada S3 já
    // embute a autenticação, não existe token separado a devolver (ver
    // comentário de decisão em `domain/portas/media-assets.repository.ts`).
    expect(resposta.body.token).toBeNull();

    // Nenhuma linha nasce em `media_assets` só por emitir a credencial (SDD
    // § Riscos técnicos — upload interrompido não pode deixar referência a
    // um arquivo inexistente): esta rota não confirma upload nenhum.
    const [linhasAntesDoUpload] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM media_assets WHERE id = ?',
      [resposta.body.mediaAssetId],
    );
    expect(linhasAntesDoUpload).toHaveLength(0);

    // Exercita a credencial contra o MinIO real de verdade, via `fetch`
    // nativo (sem SDK cliente) — prova que o que a rota devolve é utilizável
    // pelo navegador.
    caminhosParaLimpar.push(resposta.body.storagePath);
    const bytesDePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    const respostaUpload = await fetch(resposta.body.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: bytesDePng,
    });
    expect(respostaUpload.ok).toBe(true);
  });
});
