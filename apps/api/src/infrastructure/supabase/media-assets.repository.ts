import { randomUUID } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CredencialUploadEmitida,
  CriarMediaAssetInput,
  EmitirCredencialUploadInput,
  MediaAssetPersistido,
  MediaAssetsRepository,
} from '../../domain/portas/media-assets.repository';

const TABELA = 'media_assets';

interface MediaAssetRow {
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
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

/** Extensão do arquivo original (com o ponto), ou string vazia se não houver. */
function extrairExtensao(nomeArquivo: string): string {
  const indice = nomeArquivo.lastIndexOf('.');
  return indice === -1 ? '' : nomeArquivo.slice(indice);
}

/**
 * Implementa `MediaAssetsRepository` (Domínio): emite credencial de upload
 * direto ao bucket `images` via `createSignedUploadUrl` (upload assinado do
 * SDK oficial do Supabase Storage) e cria o registro em `media_assets` só
 * depois que o upload é confirmado (SDD § Riscos técnicos e mitigação —
 * "Upload de imagem interrompido no meio do envio").
 */
export class SupabaseMediaAssetsRepository implements MediaAssetsRepository {
  constructor(
    private readonly client: SupabaseClient,
    private readonly bucket: string,
  ) {}

  async emitirCredencialUpload(
    input: EmitirCredencialUploadInput,
  ): Promise<CredencialUploadEmitida> {
    const mediaAssetId = randomUUID();
    const storagePath = `${mediaAssetId}${extrairExtensao(input.originalFilename)}`;

    const { data, error } = await this.client.storage
      .from(this.bucket)
      .createSignedUploadUrl(storagePath);
    if (error) {
      throw new Error(`Falha ao emitir credencial de upload: ${error.message}`);
    }

    return {
      mediaAssetId,
      storagePath,
      signedUrl: data.signedUrl,
      token: data.token,
    };
  }

  async criar(input: CriarMediaAssetInput): Promise<MediaAssetPersistido> {
    const { data: publicUrlData } = this.client.storage
      .from(this.bucket)
      .getPublicUrl(input.storagePath);

    const { data, error } = await this.client
      .from(TABELA)
      .insert({
        ...(input.id ? { id: input.id } : {}),
        storage_path: input.storagePath,
        public_url: publicUrlData.publicUrl,
        mime_type: input.mimeType,
        size_bytes: input.sizeBytes,
        original_filename: input.originalFilename,
        width: input.width ?? null,
        height: input.height ?? null,
        created_by: input.createdBy,
      })
      .select('*')
      .single();
    if (error) {
      throw new Error(`Falha ao registrar a mídia enviada: ${error.message}`);
    }
    return paraMediaAssetPersistido(data as MediaAssetRow);
  }
}
