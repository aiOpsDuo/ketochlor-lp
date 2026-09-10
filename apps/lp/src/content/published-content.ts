import { CONTENT_SECTIONS, type SectionKey } from '@ketochlor/content-schema';

/**
 * Conteúdo de cada uma das 11 seções, tal como devolvido por
 * `GET /api/content` (SDD § Contratos de dados/API/interfaces —
 * "Conteúdo público"): as 11 chaves de `SectionKey` estão sempre presentes;
 * uma seção despublicada aparece com valor `null`, nunca omitida.
 *
 * O tipo de cada seção é derivado de `CONTENT_SECTIONS` (`@ketochlor/content-schema`)
 * em vez de redeclarado aqui — mesma fonte única de esquema usada pela API e
 * pelo painel (SDD § Riscos técnicos — "Deriva entre o esquema de seção e o
 * conteúdo já salvo").
 */
export type PublishedSections = {
  [K in SectionKey]: (typeof CONTENT_SECTIONS)[K]['initialContent'] | null;
};

/**
 * Metadados de página usados por buscadores e previews de link (SDD §
 * Linguagem ubíqua — "Metadados da página"). `@ketochlor/content-schema`
 * cobre só as 11 seções do CMS, não `site_metadata` — por isso este tipo é
 * declarado aqui, restrito aos três campos que a LP de fato consome
 * (título, descrição, imagem de compartilhamento). `updatedAt`/`updatedBy`
 * são detalhe administrativo de `site_metadata`, sem uso pela LP pública.
 */
export interface PublishedSiteMetadata {
  title: string;
  description: string;
  /**
   * URL pública pronta para uso em `<meta property="og:image">` (SDD §
   * Modelo de dados — `site_metadata.og_image_url`, renomeada de
   * `og_image_media_id` na tarefa `ajustes/corrige-imagem-metadados`: o
   * campo nunca resolvia para uma URL de verdade, porque nenhuma rota da API
   * chegava a criar o `media_assets` que ele deveria referenciar). `null`
   * quando nenhuma imagem de compartilhamento foi definida.
   */
  ogImageUrl: string | null;
}

/** Formato completo de `GET /api/content` consumido pela LP. */
export interface PublishedContent {
  sections: PublishedSections;
  metadata: PublishedSiteMetadata;
}
