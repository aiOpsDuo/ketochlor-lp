import { apiFetch } from './api-client'
import { supabase } from './supabase-client'

/** Corpo de sucesso de `POST /api/admin/media/upload-url` (`docs/API.md` § Mídia). */
interface CredencialUpload {
  mediaAssetId: string
  storagePath: string
  signedUrl: string
  token: string
}

const BUCKET_PADRAO = 'images'
// Espelha `SUPABASE_STORAGE_BUCKET` de `apps/api/.env.example` (mesmo nome de
// variável, prefixado `VITE_` por convenção do Vite) — opcional, cai no
// mesmo default `images` que a API já usa quando ausente.
const bucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET ?? BUCKET_PADRAO

/**
 * Upload real de imagem, direto do navegador ao Supabase Storage (SDD §
 * Decisões técnicas e trade-offs — "Upload direto do navegador para o
 * Storage, com credencial temporária emitida pela API"; `docs/API.md` §
 * Mídia, fluxo do cliente): primeiro pede a credencial via `POST
 * /api/admin/media/upload-url`, depois envia os bytes com o SDK do Supabase
 * Storage usando essa credencial (`uploadToSignedUrl`) — a API nunca recebe
 * o arquivo.
 *
 * **Lacuna conhecida, não introduzida por esta função:** não chama
 * `MediaAssetsRepository.criar` para registrar a mídia em `media_assets`,
 * porque `api/modulo-media` não expõe nenhuma rota HTTP para essa
 * confirmação (ver nota de decisão em
 * `apps/api/src/presentation/media/media-admin.controller.ts` e
 * `docs/API.md` § Mídia — "sem rota HTTP própria nesta tarefa"). Isso não
 * impede a imagem de funcionar na LP: `imageFieldSchema`
 * (`@ketochlor/content-schema`) só guarda `{ url, alt }`, nunca um id de
 * mídia, e o bucket `images` é público para leitura — só faltaria a
 * auditoria/contabilidade de `media_assets` para este upload específico.
 *
 * @returns a URL pública do arquivo já enviado — o valor a gravar em
 * `imagem.url` (ou equivalente) da seção.
 */
export async function enviarImagemParaStorage(
  arquivo: File,
  accessToken: string,
): Promise<string> {
  const credencial = await apiFetch<CredencialUpload>('/api/admin/media/upload-url', accessToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ originalFilename: arquivo.name, mimeType: arquivo.type }),
  })

  const { error } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(credencial.storagePath, credencial.token, arquivo, {
      contentType: arquivo.type,
    })
  if (error) {
    throw new Error(`Falha ao enviar o arquivo ao Storage: ${error.message}`)
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(credencial.storagePath)
  return data.publicUrl
}
