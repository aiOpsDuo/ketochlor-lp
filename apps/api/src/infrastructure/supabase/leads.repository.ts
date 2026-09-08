import type { SupabaseClient } from '@supabase/supabase-js';
import type { LeadValidado } from '../../domain/leads/validar-lead';
import type {
  FiltroPeriodoLeads,
  LeadPersistido,
  LeadsRepository,
} from '../../domain/portas/leads.repository';

const TABELA = 'leads';

interface LeadRow {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  crmv: string | null;
  estado_cidade: string | null;
  especialidade: string | null;
  ja_cliente_virbac: boolean;
  deseja_contato_comercial: boolean;
  origem: string | null;
  created_at: string;
}

function paraLeadPersistido(row: LeadRow): LeadPersistido {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    crmv: row.crmv,
    estadoCidade: row.estado_cidade,
    especialidade: row.especialidade,
    jaClienteVirbac: row.ja_cliente_virbac,
    desejaContatoComercial: row.deseja_contato_comercial,
    origem: row.origem,
    createdAt: row.created_at,
  };
}

/** Implementa `LeadsRepository` (Domínio) contra a tabela `leads`. */
export class SupabaseLeadsRepository implements LeadsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async criar(lead: LeadValidado): Promise<LeadPersistido> {
    const { data, error } = await this.client
      .from(TABELA)
      .insert({
        nome: lead.nome,
        email: lead.email,
        telefone: lead.telefone ?? null,
        crmv: lead.crmv ?? null,
        estado_cidade: lead.estadoCidade ?? null,
        especialidade: lead.especialidade ?? null,
        ja_cliente_virbac: lead.jaClienteVirbac ?? false,
        deseja_contato_comercial: lead.desejaContatoComercial ?? false,
        origem: lead.origem ?? null,
      })
      .select('*')
      .single();
    if (error) {
      throw new Error(`Falha ao criar o lead: ${error.message}`);
    }
    return paraLeadPersistido(data as LeadRow);
  }

  async listarPorPeriodo(filtro: FiltroPeriodoLeads = {}): Promise<LeadPersistido[]> {
    let query = this.client.from(TABELA).select('*').order('created_at', { ascending: false });
    if (filtro.from) {
      query = query.gte('created_at', filtro.from);
    }
    if (filtro.to) {
      query = query.lte('created_at', filtro.to);
    }
    const { data, error } = await query;
    if (error) {
      throw new Error(`Falha ao listar leads: ${error.message}`);
    }
    return (data ?? []).map((row) => paraLeadPersistido(row as LeadRow));
  }

  async excluir(id: string): Promise<void> {
    const { error } = await this.client.from(TABELA).delete().eq('id', id);
    if (error) {
      throw new Error(`Falha ao excluir o lead "${id}": ${error.message}`);
    }
  }
}
