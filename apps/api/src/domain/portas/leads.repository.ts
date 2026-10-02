import type { LeadValidado } from '../leads/validar-lead';

/**
 * Porta do Domínio para `leads` (SDD § Modelo de dados; § Contratos de
 * dados/API/interfaces — Leads). Ver nota de "Porta do Domínio" em
 * `content-sections.repository.ts`.
 */
export interface LeadPersistido {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  crmv: string | null;
  estadoCidade: string | null;
  especialidade: string | null;
  jaClienteVirbac: boolean;
  desejaContatoComercial: boolean;
  origem: string | null;
  createdAt: string;
  /** Sempre `true` para leads novos; `true` também nos legados (backfill de `0006_add_consentimento_to_leads.sql`). */
  consentimentoAceito: boolean;
  /** ISO 8601 UTC, relógio do servidor. Nos leads legados, igual a `createdAt` (backfill). */
  consentimentoEm: string | null;
  /** Texto do aceite que o visitante viu; `null` se não enviado ou lead legado (desconhecido). */
  consentimentoTexto: string | null;
  /** URL da política em vigor no aceite; `null` em lead legado (desconhecida). */
  consentimentoPoliticaUrl: string | null;
}

/**
 * O que `LeadsRepository.criar` recebe: o lead validado pelo Domínio mais a
 * URL da política de privacidade em vigor, anexada pela Aplicação
 * (`RegistrarLeadUseCase`, a partir de `POLITICA_PRIVACIDADE_URL`) — nunca
 * vinda do corpo da requisição. O instante do aceite (`consentimento_em`) não
 * entra aqui: a Infraestrutura grava o mesmo relógio de servidor de
 * `created_at`.
 */
export type LeadParaRegistro = LeadValidado & { consentimentoPoliticaUrl: string };

/** Filtro de período usado tanto pela listagem quanto pela exportação (mesma query, ver SDD). */
export interface FiltroPeriodoLeads {
  /** ISO 8601 — inclusive. */
  from?: string;
  /** ISO 8601 — inclusive. */
  to?: string;
}

export interface LeadsRepository {
  /** Cria um lead a partir do payload já validado pelo Domínio (`validarLead`), com o registro do consentimento. */
  criar(lead: LeadParaRegistro): Promise<LeadPersistido>;

  /**
   * Lista leads, mais recente primeiro, com filtro de período opcional.
   * Reaproveitada pela exportação CSV (`api/modulo-leads`) — a formatação em
   * si fica para aquela tarefa, esta porta só devolve os registros.
   */
  listarPorPeriodo(filtro?: FiltroPeriodoLeads): Promise<LeadPersistido[]>;

  /**
   * Exclui um lead permanentemente (SDD — exclusão a pedido do titular).
   *
   * @returns `true` se um registro existia para `id` e foi removido; `false`
   * se `id` não corresponde a nenhum lead — usado pela Apresentação
   * (`api/modulo-leads`, `DELETE /api/admin/leads/:id`) para decidir entre
   * sucesso e `404`, sem precisar de uma consulta extra de "buscar antes de
   * excluir" (o próprio `delete` do Postgres já informa quantas linhas
   * afetou).
   */
  excluir(id: string): Promise<boolean>;
}
