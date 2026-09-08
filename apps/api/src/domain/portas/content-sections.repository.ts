import type { SectionKey } from '@ketochlor/content-schema';
import type { ItemVisibilityMap } from '../visibilidade/filtrar-conteudo-publicado';

/**
 * Porta do Domínio (SDD § Camadas e padrão arquitetural — Infraestrutura
 * "implementa as portas do Domínio... depende do Domínio, nunca o
 * contrário"). Definida aqui porque `apps/api/src/infrastructure` precisa de
 * um contrato para implementar contra `content_sections`, e nenhuma porta
 * pré-existente cobria isso.
 *
 * Uma seção como o repositório a devolve — já com o `ItemVisibilityMap`
 * (`../visibilidade/filtrar-conteudo-publicado.ts`) carregado, nunca embutido
 * dentro de `data` (ver o comentário de decisão naquele arquivo).
 */
export interface SecaoPersistida<TData extends Record<string, unknown> = Record<string, unknown>> {
  key: SectionKey;
  data: TData;
  itemVisibility: ItemVisibilityMap;
  isPublished: boolean;
  updatedAt: string;
  updatedBy: string | null;
}

export interface ContentSectionsRepository {
  /** Todas as 11 seções, numa única consulta (SDD § Riscos técnicos — evita N+1). */
  buscarTodas(): Promise<SecaoPersistida[]>;

  /** Uma seção pela chave, ou `null` se `key` não existir como linha (não deveria acontecer com as 11 seções semeadas). */
  buscarPorChave(key: SectionKey): Promise<SecaoPersistida | null>;

  /**
   * Substitui `data` e `itemVisibility` de uma seção.
   *
   * Contrato obrigatório da implementação: os dois campos são escritos na
   * MESMA instrução de escrita ao banco, nunca em duas chamadas separadas —
   * o `ItemVisibilityMap` é um array paralelo alinhado por índice às listas
   * de `data`, e duas escritas independentes poderiam deixá-los
   * dessincronizados se uma lista for reordenada/reduzida entre uma e outra
   * (ver `agent_context/PLAN.md`, nota de design após
   * `api/dominio-esquemas-e-regras`).
   */
  atualizarConteudo(
    key: SectionKey,
    data: Record<string, unknown>,
    itemVisibility: ItemVisibilityMap,
    updatedBy: string | null,
  ): Promise<SecaoPersistida>;

  /** Inverte `isPublished` da seção (visibilidade da seção inteira) e devolve o novo estado. */
  alternarPublicacao(key: SectionKey, updatedBy: string | null): Promise<SecaoPersistida>;
}
