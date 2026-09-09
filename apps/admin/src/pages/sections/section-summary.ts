import type { SectionKey } from '@ketochlor/content-schema'

/**
 * Espelha `SecaoResumo` de `apps/api/src/application/content/listar-secoes.use-case.ts`
 * — a forma de cada item de `GET /api/admin/sections` (`docs/API.md`). Sem
 * pacote de contrato compartilhado entre API e painel para este formato
 * (só `@ketochlor/content-schema` é compartilhado, e cobre schema/conteúdo
 * de seção, não a forma de resposta HTTP), então o tipo é redeclarado aqui
 * deliberadamente — mesmo padrão que o próprio código da API já usa ao não
 * compartilhar DTOs de resposta com o painel.
 */
export interface SecaoResumo {
  key: SectionKey
  isPublished: boolean
  updatedAt: string
}
