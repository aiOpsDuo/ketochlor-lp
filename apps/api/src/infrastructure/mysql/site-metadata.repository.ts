import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type {
  AtualizarSiteMetadataInput,
  SiteMetadataPersistido,
  SiteMetadataRepository,
} from '../../domain/portas/site-metadata.repository';
import { agoraMysqlUtc, paraIsoUtc } from './mysql-datas';

const TABELA = 'site_metadata';
/** `site_metadata.id` é a PK singleton fixa (`CHECK (id = 1)` — SDD § Modelo de dados). */
const ID_SINGLETON = 1;

interface SiteMetadataRow extends RowDataPacket {
  title: string;
  description: string;
  og_image_url: string | null;
  updated_at: string;
  updated_by: string | null;
}

function paraSiteMetadataPersistido(row: SiteMetadataRow): SiteMetadataPersistido {
  return {
    title: row.title,
    description: row.description,
    ogImageUrl: row.og_image_url,
    updatedAt: paraIsoUtc(row.updated_at),
    updatedBy: row.updated_by,
  };
}

/**
 * Implementa `SiteMetadataRepository` (Domínio) contra o registro único de
 * `site_metadata`.
 */
export class MySqlSiteMetadataRepository implements SiteMetadataRepository {
  constructor(private readonly pool: Pool) {}

  async buscar(): Promise<SiteMetadataPersistido> {
    const [rows] = await this.pool.execute<SiteMetadataRow[]>(
      `SELECT * FROM ${TABELA} WHERE id = ? LIMIT 1`,
      [ID_SINGLETON],
    );
    if (!rows[0]) {
      throw new Error('Falha ao buscar os metadados do site: registro único não encontrado.');
    }
    return paraSiteMetadataPersistido(rows[0]);
  }

  async atualizar(input: AtualizarSiteMetadataInput): Promise<SiteMetadataPersistido> {
    const [resultado] = await this.pool.execute<ResultSetHeader>(
      `UPDATE ${TABELA} SET title = ?, description = ?, og_image_url = ?, updated_at = ?, updated_by = ? WHERE id = ?`,
      [input.title, input.description, input.ogImageUrl, agoraMysqlUtc(), input.updatedBy, ID_SINGLETON],
    );
    if (resultado.affectedRows === 0) {
      throw new Error('Falha ao atualizar os metadados do site: registro único não encontrado.');
    }
    return this.buscar();
  }
}
