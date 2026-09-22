import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type {
  CredencialUploadEmitida,
  CriarMediaAssetInput,
  EmitirCredencialUploadInput,
  MediaAssetPersistido,
  MediaAssetsRepository,
} from '../../domain/portas/media-assets.repository';
import { agoraMysqlUtc, paraIsoUtc } from '../mysql/mysql-datas';

const TABELA = 'media_assets';

/** Validade da URL pré-assinada de upload — 15 minutos, tempo generoso para o envio de uma imagem sem deixar a credencial válida por tempo demais. */
const VALIDADE_URL_SEGUNDOS = 15 * 60;

interface MediaAssetRow extends RowDataPacket {
  id: string;
  storage_path: string;
  public_url: string;
  mime_type: string;
  size_bytes: number;
  original_filename: string;
  width: number | null;
  height: number | null;
  created_at: string;
  created_by: string | null;
}

function paraMediaAssetPersistido(row: MediaAssetRow): MediaAssetPersistido {
  return {
    id: row.id,
    storagePath: row.storage_path,
    publicUrl: row.public_url,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    originalFilename: row.original_filename,
    width: row.width,
    height: row.height,
    createdAt: paraIsoUtc(row.created_at),
    createdBy: row.created_by,
  };
}

/** Extensão do arquivo original (com o ponto), ou string vazia se não houver. */
function extrairExtensao(nomeArquivo: string): string {
  const indice = nomeArquivo.lastIndexOf('.');
  return indice === -1 ? '' : nomeArquivo.slice(indice);
}

/**
 * Implementa `MediaAssetsRepository` (Domínio) sobre MinIO (protocolo S3,
 * SDD § "Migração de plataforma de dados" → Armazenamento) + MySQL
 * (`media_assets`): `emitirCredencialUpload` reserva id e caminho e devolve
 * uma credencial de upload direto ao bucket, sem gravar nada; `criar` só
 * grava a linha em `media_assets` depois que o Storage já confirmou o
 * upload (SDD § Riscos técnicos — "Upload de imagem interrompido no meio do
 * envio").
 *
 * Recebe `client` (S3) e `pool` (MySQL) por injeção — nunca instancia os
 * seus próprios, mesmo padrão de `mysql-client.factory.ts`.
 *
 * **`public_url` é de fato acessível sem credencial.** A URL devolvida por
 * `criar` é montada a partir do endpoint do MinIO + bucket + `storagePath`
 * (formato de path-style, coerente com `forcePathStyle: true` do cliente,
 * ver `minio-client.factory.ts`). O bucket criado por `minio-init`
 * (`docker/minio/init-bucket.sh`) aplica uma policy de leitura pública só de
 * objeto (`s3:GetObject`, sem listagem — tarefa
 * `ajustes/migracao-mysql-minio-bucket-leitura-publica`), então esta
 * `public_url` responde `GET` anônimo sem exigir credencial.
 */
export class MinioMediaAssetsRepository implements MediaAssetsRepository {
  constructor(
    private readonly client: S3Client,
    private readonly pool: Pool,
    private readonly bucket: string,
    private readonly endpoint: string,
  ) {}

  async emitirCredencialUpload(
    input: EmitirCredencialUploadInput,
  ): Promise<CredencialUploadEmitida> {
    const mediaAssetId = randomUUID();
    const storagePath = `${mediaAssetId}${extrairExtensao(input.originalFilename)}`;

    const comando = new PutObjectCommand({
      Bucket: this.bucket,
      Key: storagePath,
      ContentType: input.mimeType,
    });
    const signedUrl = await getSignedUrl(this.client, comando, {
      expiresIn: VALIDADE_URL_SEGUNDOS,
    });

    return {
      mediaAssetId,
      storagePath,
      signedUrl,
      // Sem token: a autenticação de uma URL pré-assinada S3 já está
      // embutida na própria URL (query string assinada) — ver comentário
      // de decisão em `domain/portas/media-assets.repository.ts` sobre
      // `token: string | null`.
      token: null,
    };
  }

  async criar(input: CriarMediaAssetInput): Promise<MediaAssetPersistido> {
    const id = input.id ?? randomUUID();
    const publicUrl = `${this.endpoint}/${this.bucket}/${input.storagePath}`;

    await this.pool.execute(
      `INSERT INTO ${TABELA}
        (id, storage_path, public_url, mime_type, size_bytes, original_filename, width, height, created_at, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        input.storagePath,
        publicUrl,
        input.mimeType,
        input.sizeBytes,
        input.originalFilename,
        input.width ?? null,
        input.height ?? null,
        agoraMysqlUtc(),
        input.createdBy,
      ],
    );

    const [rows] = await this.pool.execute<MediaAssetRow[]>(`SELECT * FROM ${TABELA} WHERE id = ?`, [
      id,
    ]);
    if (!rows[0]) {
      throw new Error(`Falha ao reler o registro de mídia "${id}" recém-criado.`);
    }
    return paraMediaAssetPersistido(rows[0]);
  }
}
