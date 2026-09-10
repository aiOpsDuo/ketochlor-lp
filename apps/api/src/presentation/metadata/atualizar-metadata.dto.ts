/**
 * Corpo de `PUT /api/admin/metadata`. Sem decorators de validação
 * (`class-validator`/`class-transformer` não são dependências deste
 * projeto, ver `apps/api/package.json`) — de propósito, mesmo padrão de
 * `presentation/content/atualizar-secao.dto.ts`: a validação é a validação
 * de negócio do Domínio (`validarSiteMetadata`), não uma checagem de forma
 * de DTO genérica. Este tipo só documenta o contrato HTTP para o controller
 * e para quem chama a API.
 */
export interface AtualizarMetadataDto {
  title: string;
  description: string;
  ogImageUrl: string | null;
}
