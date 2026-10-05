import { randomUUID } from 'node:crypto';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type {
  FiltroLeads,
  LeadParaRegistro,
  LeadPersistido,
  LeadsRepository,
} from '../../domain/portas/leads.repository';
import { agoraMysqlUtc, paraIsoUtc, paraMysqlDatetime } from './mysql-datas';
import { CLAUSULA_ESCAPE_LIKE, padraoLikeContem } from './mysql-like';

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
  consentimento_aceito: number;
  consentimento_em: string | null;
  consentimento_texto: string | null;
  consentimento_politica_url: string | null;
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
    consentimentoAceito: Boolean(row.consentimento_aceito),
    consentimentoEm: row.consentimento_em ? paraIsoUtc(row.consentimento_em) : null,
    consentimentoTexto: row.consentimento_texto,
    consentimentoPoliticaUrl: row.consentimento_politica_url,
  };
}

/** Implementa `LeadsRepository` (Domínio) contra a tabela `leads`. */
export class MySqlLeadsRepository implements LeadsRepository {
  constructor(private readonly pool: Pool) {}

  async criar(lead: LeadParaRegistro): Promise<LeadPersistido> {
    const id = randomUUID();
    // Um único instante de servidor para `created_at` e `consentimento_em`:
    // o aceite acontece no mesmo envio que cria o lead, e nunca se usa um
    // horário vindo do cliente.
    const agora = agoraMysqlUtc();
    await this.pool.execute(
      `INSERT INTO ${TABELA}
        (id, nome, email, telefone, crmv, estado_cidade, especialidade, ja_cliente_virbac, deseja_contato_comercial, origem, created_at,
         consentimento_aceito, consentimento_em, consentimento_texto, consentimento_politica_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        agora,
        lead.consentimentoAceito,
        agora,
        lead.consentimentoTexto,
        lead.consentimentoPoliticaUrl,
      ],
    );
    const [rows] = await this.pool.execute<LeadRow[]>(`SELECT * FROM ${TABELA} WHERE id = ?`, [id]);
    if (!rows[0]) {
      throw new Error(`Falha ao reler o lead "${id}" recém-criado.`);
    }
    return paraLeadPersistido(rows[0]);
  }

  async listar(filtro: FiltroLeads = {}): Promise<LeadPersistido[]> {
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
    if (filtro.email) {
      // `LOWER` dos dois lados: "contém, sem diferenciar maiúsculas" é
      // contrato da porta, não um efeito colateral da collation da coluna
      // (que hoje já é case-insensitive, mas poderia mudar). Sem índice útil
      // de qualquer forma — o `%` inicial do "contém" já obriga a varrer a
      // tabela, aceitável no volume de leads do PRD.
      condicoes.push(`LOWER(email) LIKE LOWER(?) ${CLAUSULA_ESCAPE_LIKE}`);
      parametros.push(padraoLikeContem(filtro.email));
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
