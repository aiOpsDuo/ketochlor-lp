/**
 * Espelha `LeadPersistido` de `apps/api/src/domain/portas/leads.repository.ts`
 * — a forma de cada item de `GET /api/admin/leads` (`docs/API.md`). Mesmo
 * padrão de `SecaoResumo` (`apps/admin/src/pages/sections/section-summary.ts`):
 * sem pacote de contrato compartilhado entre API e painel para a forma de
 * resposta HTTP, o tipo é redeclarado aqui de propósito.
 */
export interface LeadResumo {
  id: string
  nome: string
  email: string
  telefone: string | null
  crmv: string | null
  estadoCidade: string | null
  especialidade: string | null
  jaClienteVirbac: boolean
  desejaContatoComercial: boolean
  origem: string | null
  createdAt: string
}
