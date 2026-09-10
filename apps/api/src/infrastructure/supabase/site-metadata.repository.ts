import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  AtualizarSiteMetadataInput,
  SiteMetadataPersistido,
  SiteMetadataRepository,
} from '../../domain/portas/site-metadata.repository';

const TABELA = 'site_metadata';
/** `site_metadata.id` é uma PK booleana fixa (`check (id)`) — sempre `true` (SDD § Modelo de dados). */
const ID_SINGLETON = true;

interface SiteMetadataRow {
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
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  };
}

/**
 * Implementa `SiteMetadataRepository` (Domínio) contra o registro único de
 * `site_metadata`.
 */
export class SupabaseSiteMetadataRepository implements SiteMetadataRepository {
  constructor(private readonly client: SupabaseClient) {}

  async buscar(): Promise<SiteMetadataPersistido> {
    const { data, error } = await this.client
      .from(TABELA)
      .select('*')
      .eq('id', ID_SINGLETON)
      .single();
    if (error) {
      throw new Error(`Falha ao buscar os metadados do site: ${error.message}`);
    }
    return paraSiteMetadataPersistido(data as SiteMetadataRow);
  }

  async atualizar(input: AtualizarSiteMetadataInput): Promise<SiteMetadataPersistido> {
    const { data, error } = await this.client
      .from(TABELA)
      .update({
        title: input.title,
        description: input.description,
        og_image_url: input.ogImageUrl,
        updated_at: new Date().toISOString(),
        updated_by: input.updatedBy,
      })
      .eq('id', ID_SINGLETON)
      .select('*')
      .single();
    if (error) {
      throw new Error(`Falha ao atualizar os metadados do site: ${error.message}`);
    }
    return paraSiteMetadataPersistido(data as SiteMetadataRow);
  }
}
