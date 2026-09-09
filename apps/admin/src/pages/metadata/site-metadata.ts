/**
 * Espelha `SiteMetadataPersistido` de
 * `apps/api/src/domain/portas/site-metadata.repository.ts` — a forma de
 * `GET`/`PUT /api/admin/metadata` (`docs/API.md`). Mesmo padrão de
 * `pages/sections/section-summary.ts`: sem pacote de contrato compartilhado
 * entre API e painel para a forma de resposta HTTP, o tipo é redeclarado
 * aqui deliberadamente.
 */
export interface SiteMetadata {
  title: string
  description: string
  ogImageMediaId: string | null
  updatedAt: string
  updatedBy: string | null
}
