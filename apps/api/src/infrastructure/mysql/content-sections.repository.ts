import type { Pool, ResultSetHeader, RowDataPacket } from 'mysql2/promise';
import type { SectionKey } from '@ketochlor/content-schema';
import type {
  ContentSectionsRepository,
  SecaoPersistida,
} from '../../domain/portas/content-sections.repository';
import type { ItemVisibilityMap } from '../../domain/visibilidade/filtrar-conteudo-publicado';
import { agoraMysqlUtc, paraIsoUtc } from './mysql-datas';

const TABELA = 'content_sections';

interface ContentSectionRow extends RowDataPacket {
  key: string;
  data: Record<string, unknown> | string;
  item_visibility: ItemVisibilityMap | string | null;
  is_published: number;
  updated_at: string;
  updated_by: string | null;
}

/**
 * O driver `mysql2` interpreta colunas `JSON` automaticamente e já devolve
 * objeto/array — o `typeof ... === 'string'` aqui é só uma salvaguarda
 * defensiva (ex. driver configurado diferente, coluna lida via `CAST`),
 * nunca o caminho esperado.
 */
function paraJson<T>(valor: T | string): T {
  return typeof valor === 'string' ? (JSON.parse(valor) as T) : valor;
}

function paraSecaoPersistida(row: ContentSectionRow): SecaoPersistida {
  return {
    key: row.key as SectionKey,
    data: paraJson(row.data),
    itemVisibility: row.item_visibility ? paraJson(row.item_visibility) : {},
    isPublished: Boolean(row.is_published),
    updatedAt: paraIsoUtc(row.updated_at),
    updatedBy: row.updated_by,
  };
}

/**
 * Implementa `ContentSectionsRepository` (Domínio) contra a tabela
 * `content_sections` via `mysql2/promise` (SDD § Camadas e padrão
 * arquitetural — Infraestrutura; § "Migração de plataforma de dados").
 * Espelha o contrato exato de `SupabaseContentSectionsRepository`.
 */
export class MySqlContentSectionsRepository implements ContentSectionsRepository {
  constructor(private readonly pool: Pool) {}

  async buscarTodas(): Promise<SecaoPersistida[]> {
    const [rows] = await this.pool.execute<ContentSectionRow[]>(`SELECT * FROM ${TABELA}`);
    return rows.map(paraSecaoPersistida);
  }

  async buscarPorChave(key: SectionKey): Promise<SecaoPersistida | null> {
    const [rows] = await this.pool.execute<ContentSectionRow[]>(
      `SELECT * FROM ${TABELA} WHERE \`key\` = ? LIMIT 1`,
      [key],
    );
    return rows[0] ? paraSecaoPersistida(rows[0]) : null;
  }

  async atualizarConteudo(
    key: SectionKey,
    data: Record<string, unknown>,
    itemVisibility: ItemVisibilityMap,
    updatedBy: string | null,
  ): Promise<SecaoPersistida> {
    // `data` e `item_visibility` na MESMA instrução UPDATE — contrato da
    // porta (ver `content-sections.repository.ts` no Domínio), nunca duas
    // queries separadas.
    const [resultado] = await this.pool.execute<ResultSetHeader>(
      `UPDATE ${TABELA} SET data = ?, item_visibility = ?, updated_at = ?, updated_by = ? WHERE \`key\` = ?`,
      [JSON.stringify(data), JSON.stringify(itemVisibility), agoraMysqlUtc(), updatedBy, key],
    );
    if (resultado.affectedRows === 0) {
      throw new Error(`Falha ao atualizar a seção "${key}": nenhuma linha encontrada.`);
    }
    const atualizada = await this.buscarPorChave(key);
    if (!atualizada) {
      throw new Error(`Falha ao reler a seção "${key}" após atualizar.`);
    }
    return atualizada;
  }

  async alternarPublicacao(key: SectionKey, updatedBy: string | null): Promise<SecaoPersistida> {
    const atual = await this.buscarPorChave(key);
    if (!atual) {
      throw new Error(`Seção "${key}" não encontrada.`);
    }
    const [resultado] = await this.pool.execute<ResultSetHeader>(
      `UPDATE ${TABELA} SET is_published = ?, updated_at = ?, updated_by = ? WHERE \`key\` = ?`,
      [!atual.isPublished, agoraMysqlUtc(), updatedBy, key],
    );
    if (resultado.affectedRows === 0) {
      throw new Error(`Falha ao alternar a publicação da seção "${key}": nenhuma linha encontrada.`);
    }
    const atualizada = await this.buscarPorChave(key);
    if (!atualizada) {
      throw new Error(`Falha ao reler a seção "${key}" após alternar a publicação.`);
    }
    return atualizada;
  }
}
