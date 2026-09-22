import { DeleteObjectCommand, HeadObjectCommand, type S3Client } from '@aws-sdk/client-s3';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { criarMinioClient } from './minio-client.factory';
import { MinioMediaAssetsRepository } from './media-assets.repository';
import { criarMysqlPool } from '../mysql/mysql-client.factory';
import { carregarMinioTestEnv } from '../test-support/minio-test-env';
import { carregarMysqlTestEnv } from '../test-support/mysql-test-env';

/**
 * Teste de integração REAL (sem mock) contra o `minio`+`mysql` do
 * `docker-compose.yml` — mesmo critério de "pronto" já usado pelos testes
 * `infrastructure/mysql/*.repository.test.ts`. O `PUT` do arquivo de teste
 * contra a URL pré-assinada usa `fetch` nativo do Node, sem SDK cliente —
 * simulando exatamente o que o navegador do painel faz de verdade.
 */
describe('MinioMediaAssetsRepository (infra)', () => {
  let client: S3Client;
  let pool: Pool;
  let bucket: string;
  let endpoint: string;
  let repositorio: MinioMediaAssetsRepository;
  const idsParaLimpar: string[] = [];
  const caminhosParaLimpar: string[] = [];

  beforeAll(() => {
    // Timeout maior que o default do vitest (5s) — teste de INTEGRAÇÃO real
    // contra MinIO/MySQL de verdade, mesmo comentário de
    // `leads.repository.test.ts`.
    vi.setConfig({ testTimeout: 20_000 });
    const minioEnv = carregarMinioTestEnv();
    client = criarMinioClient(minioEnv);
    bucket = minioEnv.bucket;
    endpoint = minioEnv.endpoint;
    pool = criarMysqlPool(carregarMysqlTestEnv());
    repositorio = new MinioMediaAssetsRepository(client, pool, bucket, endpoint);
  });

  afterAll(async () => {
    if (idsParaLimpar.length > 0) {
      await pool.execute(
        `DELETE FROM media_assets WHERE id IN (${idsParaLimpar.map(() => '?').join(',')})`,
        idsParaLimpar,
      );
    }
    await Promise.all(
      caminhosParaLimpar.map((storagePath) =>
        client.send(new DeleteObjectCommand({ Bucket: bucket, Key: storagePath })),
      ),
    );
    await pool.end();
    client.destroy();
  });

  it('emite uma credencial de upload sem token (autenticação embutida na URL) e não cria linha antes do upload', async () => {
    const credencial = await repositorio.emitirCredencialUpload({
      originalFilename: 'selo-teste.png',
      mimeType: 'image/png',
    });

    expect(credencial.mediaAssetId).toBeTruthy();
    expect(credencial.storagePath).toBe(`${credencial.mediaAssetId}.png`);
    expect(credencial.signedUrl).toBeTruthy();
    expect(credencial.signedUrl).toContain(bucket);
    // Ver comentário em `domain/portas/media-assets.repository.ts`: uma URL
    // pré-assinada S3 já embute a autenticação, não existe token separado a
    // devolver.
    expect(credencial.token).toBeNull();

    // Confirma que nenhuma linha nasce em media_assets antes do upload (SDD
    // § Riscos técnicos: upload interrompido não pode deixar referência a um
    // arquivo inexistente).
    const [rowsAntes] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM media_assets WHERE id = ?',
      [credencial.mediaAssetId],
    );
    expect(rowsAntes).toHaveLength(0);
  });

  it('faz upload real via PUT HTTP puro contra a signedUrl, confirma o objeto no bucket e grava media_assets', async () => {
    const credencial = await repositorio.emitirCredencialUpload({
      originalFilename: 'selo-teste.png',
      mimeType: 'image/png',
    });

    // PNG 1x1 válido.
    const bytesDePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );

    // `fetch` nativo do Node — sem SDK cliente, simulando o navegador.
    const respostaUpload = await fetch(credencial.signedUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/png' },
      body: bytesDePng,
    });
    expect(respostaUpload.ok).toBe(true);
    caminhosParaLimpar.push(credencial.storagePath);

    // Confirma que o objeto existe de fato no bucket, via HeadObjectCommand.
    const head = await client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: credencial.storagePath }),
    );
    expect(head.ContentLength).toBe(bytesDePng.byteLength);

    const registro = await repositorio.criar({
      id: credencial.mediaAssetId,
      storagePath: credencial.storagePath,
      mimeType: 'image/png',
      sizeBytes: bytesDePng.byteLength,
      originalFilename: 'selo-teste.png',
      width: 1,
      height: 1,
      createdBy: null,
    });
    idsParaLimpar.push(registro.id);

    expect(registro.id).toBe(credencial.mediaAssetId);
    expect(registro.storagePath).toBe(credencial.storagePath);
    expect(registro.publicUrl).toBe(`${endpoint}/${bucket}/${credencial.storagePath}`);
    expect(registro.mimeType).toBe('image/png');
    expect(registro.sizeBytes).toBe(bytesDePng.byteLength);
    expect(registro.originalFilename).toBe('selo-teste.png');
    expect(registro.width).toBe(1);
    expect(registro.height).toBe(1);
    expect(registro.createdBy).toBeNull();
    expect(registro.createdAt).toBeTruthy();

    // Leitura real da tabela (não só o retorno do repositório) — confere que
    // `criar` de fato persistiu os campos certos em `media_assets`.
    const [rows] = await pool.execute<RowDataPacket[]>('SELECT * FROM media_assets WHERE id = ?', [
      registro.id,
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].storage_path).toBe(credencial.storagePath);
    expect(rows[0].public_url).toBe(`${endpoint}/${bucket}/${credencial.storagePath}`);
    expect(rows[0].mime_type).toBe('image/png');
    expect(Number(rows[0].size_bytes)).toBe(bytesDePng.byteLength);
    expect(rows[0].original_filename).toBe('selo-teste.png');
    expect(rows[0].width).toBe(1);
    expect(rows[0].height).toBe(1);
  });

  it('gera um novo id quando `criar` não recebe um explícito', async () => {
    const bytesDePng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );

    const registro = await repositorio.criar({
      storagePath: 'sem-id-explicito-teste.png',
      mimeType: 'image/png',
      sizeBytes: bytesDePng.byteLength,
      originalFilename: 'sem-id-explicito.png',
      createdBy: null,
    });
    idsParaLimpar.push(registro.id);

    expect(registro.id).toBeTruthy();
    expect(registro.width).toBeNull();
    expect(registro.height).toBeNull();
  });
});
