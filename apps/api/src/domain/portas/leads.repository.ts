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
}

/** Filtro de período usado tanto pela listagem quanto pela exportação (mesma query, ver SDD). */
export interface FiltroPeriodoLeads {
  /** ISO 8601 — inclusive. */
  from?: string;
  /** ISO 8601 — inclusive. */
  to?: string;
}

export interface LeadsRepository {
  /** Cria um lead a partir do payload já validado pelo Domínio (`validarLead`) — `consentimentoAceito` nunca chega aqui. */
  criar(lead: LeadValidado): Promise<LeadPersistido>;

  /**
   * Lista leads, mais recente primeiro, com filtro de período opcional.
   * Reaproveitada pela exportação CSV (`api/modulo-leads`) — a formatação em
   * si fica para aquela tarefa, esta porta só devolve os registros.
   */
  listarPorPeriodo(filtro?: FiltroPeriodoLeads): Promise<LeadPersistido[]>;

  /** Exclui um lead permanentemente (SDD — exclusão a pedido do titular). */
  excluir(id: string): Promise<void>;
}
