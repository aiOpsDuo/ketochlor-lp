/**
 * Porta do Domínio para `media_assets` e para a emissão de credencial de
 * upload direto ao Storage (SDD § Decisões técnicas e trade-offs — "Upload
 * direto do navegador para o Storage, com credencial temporária emitida pela
 * API"; § Riscos técnicos — "Upload de imagem interrompido no meio do
 * envio"). Ver nota de "Porta do Domínio" em `content-sections.repository.ts`.
 */
export interface MediaAssetPersistido {
  id: string;
  storagePath: string;
  publicUrl: string;
  mimeType: string;
  sizeBytes: number;
  originalFilename: string;
  width: number | null;
  height: number | null;
  createdAt: string;
  createdBy: string | null;
}

export interface CriarMediaAssetInput {
  /**
   * Id reservado por `emitirCredencialUpload` (mesmo usado como base do
   * `storagePath`), reaproveitado aqui para que a referência que o painel já
   * pode ter colocado num documento de seção continue apontando para o
   * registro certo assim que ele nascer. Opcional: se omitido, um novo id é
   * gerado pelo banco.
   */
  id?: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  originalFilename: string;
  width?: number | null;
  height?: number | null;
  createdBy: string | null;
}

export interface EmitirCredencialUploadInput {
  originalFilename: string;
  mimeType: string;
}

/**
 * Credencial de upload direto ao Storage. `mediaAssetId`/`storagePath` são
 * reservados no momento da emissão, mas o registro em `media_assets` só é
 * criado (via `criar`) depois que o upload é confirmado — nunca antes (SDD
 * § Riscos técnicos: um upload interrompido não deve deixar nenhuma seção
 * apontando para um arquivo inexistente).
 *
 * `token` é `string | null` (tarefa `ajustes/migracao-mysql-adapter-midia-
 * minio`): uma URL pré-assinada S3 (`MinioMediaAssetsRepository`) já embute
 * toda a autenticação na própria URL — não existe um token equivalente a
 * devolver, e inventar um valor não seria honesto sobre o que o adaptador de
 * fato oferece. `MinioMediaAssetsRepository.emitirCredencialUpload` devolve
 * `token: null`; o consumidor (`apps/admin/src/lib/media-upload.ts`) faz um
 * `PUT` HTTP simples direto à `signedUrl`, sem token.
 */
export interface CredencialUploadEmitida {
  mediaAssetId: string;
  storagePath: string;
  signedUrl: string;
  token: string | null;
}

export interface MediaAssetsRepository {
  /** Emite a credencial temporária de upload direto ao bucket `images`, sem criar linha em `media_assets` ainda. */
  emitirCredencialUpload(input: EmitirCredencialUploadInput): Promise<CredencialUploadEmitida>;

  /** Cria o registro em `media_assets` — só deve ser chamado depois que o Storage confirma o upload dos bytes. */
  criar(input: CriarMediaAssetInput): Promise<MediaAssetPersistido>;
}
