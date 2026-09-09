import type { SectionKey } from '@ketochlor/content-schema'

/**
 * Espelha `SecaoPersistida` de
 * `apps/api/src/domain/portas/content-sections.repository.ts` — a forma de
 * `GET`/`PUT /api/admin/sections/:key` (`docs/API.md`). Mesmo padrão de
 * `section-summary.ts`/`metadata/site-metadata.ts`: sem pacote de contrato
 * compartilhado para a forma de resposta HTTP, o tipo é redeclarado aqui
 * deliberadamente.
 */
export interface SecaoDetalhe {
  key: SectionKey
  data: Record<string, unknown>
  itemVisibility: Partial<Record<string, boolean[]>>
  isPublished: boolean
  updatedAt: string
  updatedBy: string | null
}
