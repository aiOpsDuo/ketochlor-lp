/**
 * Espelha `Operador` de `apps/api/src/domain/operators/operador.ts` — a forma
 * de cada item de `GET /api/admin/operators` (`docs/API.md`). Mesmo padrão de
 * `LeadResumo` (`apps/admin/src/pages/leads/lead-summary.ts`): sem pacote de
 * contrato compartilhado entre API e painel para a forma de resposta HTTP, o
 * tipo é redeclarado aqui de propósito.
 */
export interface OperatorResumo {
  id: string
  email: string
  nome: string
  criadoEm: string
  ultimoLoginEm: string | null
}
