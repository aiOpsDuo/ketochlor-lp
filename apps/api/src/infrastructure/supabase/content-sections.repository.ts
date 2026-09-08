import type { SupabaseClient } from '@supabase/supabase-js';
import type { SectionKey } from '@ketochlor/content-schema';
import type {
  ContentSectionsRepository,
  SecaoPersistida,
} from '../../domain/portas/content-sections.repository';
import type { ItemVisibilityMap } from '../../domain/visibilidade/filtrar-conteudo-publicado';

const TABELA = 'content_sections';

interface ContentSectionRow {
  key: string;
  data: Record<string, unknown>;
  item_visibility: ItemVisibilityMap | null;
  is_published: boolean;
  updated_at: string;
  updated_by: string | null;
}

function paraSecaoPersistida(row: ContentSectionRow): SecaoPersistida {
  return {
    key: row.key as SectionKey,
    data: row.data,
    itemVisibility: row.item_visibility ?? {},
    isPublished: row.is_published,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

/**
 * Implementa `ContentSectionsRepository` (Domínio) contra a tabela
 * `content_sections` via `@supabase/supabase-js` (SDD § Camadas e padrão
 * arquitetural — Infraestrutura).
 */
export class SupabaseContentSectionsRepository implements ContentSectionsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async buscarTodas(): Promise<SecaoPersistida[]> {
    const { data, error } = await this.client.from(TABELA).select('*');
    if (error) {
      throw new Error(`Falha ao buscar seções de conteúdo: ${error.message}`);
    }
    return (data ?? []).map((row) => paraSecaoPersistida(row as ContentSectionRow));
  }

  async buscarPorChave(key: SectionKey): Promise<SecaoPersistida | null> {
    const { data, error } = await this.client
      .from(TABELA)
      .select('*')
      .eq('key', key)
      .maybeSingle();
    if (error) {
      throw new Error(`Falha ao buscar a seção "${key}": ${error.message}`);
    }
    return data ? paraSecaoPersistida(data as ContentSectionRow) : null;
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
    const { data: row, error } = await this.client
      .from(TABELA)
      .update({
        data,
        item_visibility: itemVisibility,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      })
      .eq('key', key)
      .select('*')
      .single();
    if (error) {
      throw new Error(`Falha ao atualizar a seção "${key}": ${error.message}`);
    }
    return paraSecaoPersistida(row as ContentSectionRow);
  }

  async alternarPublicacao(key: SectionKey, updatedBy: string | null): Promise<SecaoPersistida> {
    const atual = await this.buscarPorChave(key);
    if (!atual) {
      throw new Error(`Seção "${key}" não encontrada.`);
    }
    const { data: row, error } = await this.client
      .from(TABELA)
      .update({
        is_published: !atual.isPublished,
        updated_at: new Date().toISOString(),
        updated_by: updatedBy,
      })
      .eq('key', key)
      .select('*')
      .single();
    if (error) {
      throw new Error(`Falha ao alternar a publicação da seção "${key}": ${error.message}`);
    }
    return paraSecaoPersistida(row as ContentSectionRow);
  }
}
