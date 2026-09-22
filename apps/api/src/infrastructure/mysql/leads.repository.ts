import { randomUUID } from 'node:crypto';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { LeadValidado } from '../../domain/leads/validar-lead';
import type {
  FiltroPeriodoLeads,
  LeadPersistido,
  LeadsRepository,
} from '../../domain/portas/leads.repository';
import { agoraMysqlUtc, paraIsoUtc, paraMysqlDatetime } from './mysql-datas';

const TABELA = 'leads';

interface LeadRow extends RowDataPacket {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  crmv: string | null;
  estado_cidade: string | null;
  especialidade: string | null;
  ja_cliente_virbac: number;
  deseja_contato_comercial: number;
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
    jaClienteVirbac: Boolean(row.ja_cliente_virbac),
    desejaContatoComercial: Boolean(row.deseja_contato_comercial),
    origem: row.origem,
    createdAt: paraIsoUtc(row.created_at),
  };
}

/** Implementa `LeadsRepository` (Domínio) contra a tabela `leads`. */
export class MySqlLeadsRepository implements LeadsRepository {
  constructor(private readonly pool: Pool) {}

  async criar(lead: LeadValidado): Promise<LeadPersistido> {
    const id = randomUUID();
    await this.pool.execute(
      `INSERT INTO ${TABELA}
        (id, nome, email, telefone, crmv, estado_cidade, especialidade, ja_cliente_virbac, deseja_contato_comercial, origem, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        lead.nome,
        lead.email,
        lead.telefone ?? null,
        lead.crmv ?? null,
        lead.estadoCidade ?? null,
        lead.especialidade ?? null,
        lead.jaClienteVirbac ?? false,
        lead.desejaContatoComercial ?? false,
        lead.origem ?? null,
        agoraMysqlUtc(),
      ],
    );
    const [rows] = await this.pool.execute<LeadRow[]>(`SELECT * FROM ${TABELA} WHERE id = ?`, [id]);
    if (!rows[0]) {
      throw new Error(`Falha ao reler o lead "${id}" recém-criado.`);
    }
    return paraLeadPersistido(rows[0]);
  }

  async listarPorPeriodo(filtro: FiltroPeriodoLeads = {}): Promise<LeadPersistido[]> {
    const condicoes: string[] = [];
    const parametros: string[] = [];
    if (filtro.from) {
      condicoes.push('created_at >= ?');
      parametros.push(paraMysqlDatetime(filtro.from));
    }
    if (filtro.to) {
      condicoes.push('created_at <= ?');
      parametros.push(paraMysqlDatetime(filtro.to));
    }
    const whereClause = condicoes.length > 0 ? `WHERE ${condicoes.join(' AND ')}` : '';

    const [rows] = await this.pool.execute<LeadRow[]>(
      `SELECT * FROM ${TABELA} ${whereClause} ORDER BY created_at DESC`,
      parametros,
    );
    return rows.map(paraLeadPersistido);
  }

  async excluir(id: string): Promise<boolean> {
    // `affectedRows` do resultado do próprio DELETE informa se uma linha foi
    // de fato removida, sem uma consulta extra de leitura antes (contrato da
    // porta: `excluir` devolve `boolean`, não `void`).
    const [resultado] = await this.pool.execute<ResultSetHeader>(`DELETE FROM ${TABELA} WHERE id = ?`, [
      id,
    ]);
    return resultado.affectedRows > 0;
  }
}
