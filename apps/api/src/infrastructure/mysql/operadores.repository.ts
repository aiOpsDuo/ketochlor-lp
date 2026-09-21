import { randomUUID } from 'node:crypto';
import { hash } from 'bcryptjs';
import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { Operador } from '../../domain/operators/operador';
import type {
  CriarOperadorInput,
  OperadoresRepository,
} from '../../domain/portas/operadores.repository';
import type {
  OperadorComCredenciais,
  OperadorCredenciaisRepository,
} from '../../domain/portas/operador-credenciais.repository';
import { agoraMysqlUtc, paraIsoUtc } from './mysql-datas';

const TABELA = 'operators';

/**
 * Custo (`rounds`) do hash `bcryptjs` — 12 é o piso hoje recomendado pela
 * própria OWASP para bcrypt (2^12 iterações), acima do default histórico da
 * biblioteca (10); um operador do painel loga com pouca frequência, então o
 * custo extra de CPU no login é irrelevante frente ao ganho de resistência a
 * força bruta offline caso o `senha_hash` vaze.
 */
const CUSTO_HASH_BCRYPT = 12;

interface OperadorRow extends RowDataPacket {
  id: string;
  email: string;
  nome: string;
  senha_hash: string;
  criado_em: string;
  ultimo_login_em: string | null;
}

function paraOperador(row: OperadorRow): Operador {
  return {
    id: row.id,
    email: row.email,
    nome: row.nome,
    criadoEm: paraIsoUtc(row.criado_em),
    ultimoLoginEm: row.ultimo_login_em ? paraIsoUtc(row.ultimo_login_em) : null,
  };
}

/**
 * Implementa DUAS portas do Domínio contra a tabela própria `operators`
 * (SDD § Modelo de dados): `OperadoresRepository` (CRUD administrativo —
 * mesmo contrato de `SupabaseOperadoresRepository`, que esta classe substitui
 * na tarefa `migracao-mysql-cutover-wiring`, ainda não feita) e
 * `OperadorCredenciaisRepository` (login — porta nova, sem equivalente
 * Supabase possível, ver comentário de decisão naquela porta).
 */
export class MySqlOperadoresRepository implements OperadoresRepository, OperadorCredenciaisRepository {
  constructor(private readonly pool: Pool) {}

  async listarTodos(): Promise<Operador[]> {
    const [rows] = await this.pool.execute<OperadorRow[]>(
      `SELECT * FROM ${TABELA} ORDER BY criado_em DESC`,
    );
    return rows.map(paraOperador);
  }

  /**
   * Gera o `id` (UUID) na aplicação e o hash da senha via `bcryptjs` ANTES de
   * gravar — a senha em texto plano nunca chega a ser serializada em nenhuma
   * query (só `senhaHash` entra no `INSERT`).
   */
  async criar(input: CriarOperadorInput): Promise<Operador> {
    const id = randomUUID();
    const senhaHash = await hash(input.senha, CUSTO_HASH_BCRYPT);
    await this.pool.execute(
      `INSERT INTO ${TABELA} (id, email, nome, senha_hash, criado_em) VALUES (?, ?, ?, ?, ?)`,
      [id, input.email, input.nome, senhaHash, agoraMysqlUtc()],
    );
    const [rows] = await this.pool.execute<OperadorRow[]>(`SELECT * FROM ${TABELA} WHERE id = ?`, [
      id,
    ]);
    if (!rows[0]) {
      throw new Error(`Falha ao reler o operador "${id}" recém-criado.`);
    }
    return paraOperador(rows[0]);
  }

  async remover(id: string): Promise<void> {
    await this.pool.execute<ResultSetHeader>(`DELETE FROM ${TABELA} WHERE id = ?`, [id]);
  }

  async buscarPorEmail(email: string): Promise<OperadorComCredenciais | null> {
    const [rows] = await this.pool.execute<OperadorRow[]>(
      `SELECT * FROM ${TABELA} WHERE email = ?`,
      [email],
    );
    const row = rows[0];
    if (!row) {
      return null;
    }
    return { operador: paraOperador(row), senhaHash: row.senha_hash };
  }

  async atualizarUltimoLogin(id: string): Promise<void> {
    await this.pool.execute(`UPDATE ${TABELA} SET ultimo_login_em = ? WHERE id = ?`, [
      agoraMysqlUtc(),
      id,
    ]);
  }
}
