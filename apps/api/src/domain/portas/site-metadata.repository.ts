/**
 * Porta do Domínio para o registro único de `site_metadata` (SDD § Modelo de
 * dados). Ver nota de "Porta do Domínio" em `content-sections.repository.ts`.
 */
export interface SiteMetadataPersistido {
  title: string;
  description: string;
  ogImageUrl: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export interface AtualizarSiteMetadataInput {
  title: string;
  description: string;
  ogImageUrl: string | null;
  updatedBy: string | null;
}

export interface SiteMetadataRepository {
  /** Lê o registro único (não há filtro — `site_metadata` tem exatamente uma linha). */
  buscar(): Promise<SiteMetadataPersistido>;

  /** Substitui os campos editáveis do registro único e devolve o novo estado. */
  atualizar(input: AtualizarSiteMetadataInput): Promise<SiteMetadataPersistido>;
}
