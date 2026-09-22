import { apiFetch } from './api-client'

/** Corpo de sucesso de `POST /api/admin/media/upload-url` (`docs/API.md` § Mídia). */
interface CredencialUpload {
  mediaAssetId: string
  storagePath: string
  signedUrl: string
  /**
   * Sempre `null` no adaptador MinIO (SDD § "Migração de plataforma de
   * dados" → Armazenamento) — uma URL pré-assinada S3 já embute toda a
   * autenticação necessária na própria URL (query string assinada), então
   * não existe um token separado a devolver. Mantido no tipo só para
   * espelhar o contrato real da API; esta função nunca o lê.
   */
  token: string | null
}

/**
 * Upload real de imagem, direto do navegador ao MinIO (SDD § Decisões
 * técnicas e trade-offs — "Upload direto do navegador para o Storage, com
 * credencial temporária emitida pela API"; § "Migração de plataforma de
 * dados" → Armazenamento): primeiro pede a credencial via `POST
 * /api/admin/media/upload-url`, depois envia os bytes com um `PUT` HTTP
 * simples contra a `signedUrl` devolvida — padrão de upload S3 pré-assinado,
 * sem nenhum SDK cliente no navegador (a API nunca recebe o arquivo).
 *
 * **Lacuna conhecida, não introduzida por esta função** (reinvestigada
 * nesta tarefa, `ajustes/migracao-mysql-painel-auth-e-upload`, contra
 * `apps/api/src/presentation/media/media-admin.controller.ts` e
 * `media.e2e.test.ts`): `POST /api/admin/media/upload-url` continua sendo a
 * ÚNICA rota deste módulo — não há endpoint para confirmar o upload e
 * gravar `media_assets` (`MediaAssetsRepository.criar` nunca é chamado a
 * partir do painel). Isso não impede a imagem de funcionar na LP:
 * `imageFieldSchema` (`@ketochlor/content-schema`) só guarda `{ url, alt }`,
 * nunca um id de mídia, e o bucket `images` tem policy de leitura pública
 * (`docker/minio/init-bucket.sh`) — só falta a auditoria/contabilidade de
 * `media_assets` para este upload específico, mesma lacuna documentada
 * desde antes da migração de plataforma de dados.
 *
 * A URL pública é derivada da própria `signedUrl`, removendo a query string
 * de assinatura: o cliente S3 do servidor usa `forcePathStyle: true`
 * (`infrastructure/minio/minio-client.factory.ts`), então o caminho de
 * `signedUrl` já é `<endpoint>/<bucket>/<storagePath>` — o mesmo formato que
 * `MediaAssetsRepository.criar` monta como `public_url`
 * (`infrastructure/minio/media-assets.repository.ts`). Como o bucket
 * permite `GET` anônimo, essa URL sem query string já é publicamente
 * acessível, sem precisar de nenhuma variável de ambiente própria do painel
 * para o endpoint do MinIO.
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

  const respostaUpload = await fetch(credencial.signedUrl, {
    method: 'PUT',
    headers: { 'Content-Type': arquivo.type },
    body: arquivo,
  })
  if (!respostaUpload.ok) {
    throw new Error(`Falha ao enviar o arquivo ao Storage (HTTP ${respostaUpload.status}).`)
  }

  const urlAssinada = new URL(credencial.signedUrl)
  return `${urlAssinada.origin}${urlAssinada.pathname}`
}
