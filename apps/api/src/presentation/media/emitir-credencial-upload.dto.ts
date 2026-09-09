/**
 * Corpo de `POST /api/admin/media/upload-url`. Sem decorators de validação
 * (`class-validator`/`class-transformer` não são dependências deste projeto,
 * ver `apps/api/package.json`) — de propósito, mesmo padrão de
 * `presentation/metadata/atualizar-metadata.dto.ts`: a validação é a
 * validação de negócio do Domínio (`validarSolicitacaoUpload`), não uma
 * checagem de forma de DTO genérica. Este tipo só documenta o contrato HTTP
 * para o controller e para quem chama a API.
 */
export interface EmitirCredencialUploadDto {
  /** Nome do arquivo tal como enviado pelo navegador (usado para preservar a extensão no `storagePath`). */
  originalFilename: string;
  /** Precisa começar com `"image/"` — não há suporte a vídeo nesta versão do Ketochlor. */
  mimeType: string;
}
