/**
 * Regras de visibilidade (SDD § Camadas e padrão arquitetural — Domínio;
 * § Modelo de dados; PRD § Fluxo de UX — "Controle de visibilidade de item e
 * de seção").
 *
 * Decisão de onde vive a visibilidade de item (registrada aqui, não em
 * `@ketochlor/content-schema`): o SDD (§ Modelo de dados) só lista `data`,
 * `is_published`, `updated_at`, `updated_by` em `content_sections` — não há
 * coluna nem campo de item para isso. Se um `visivel?: boolean` fosse
 * adicionado a cada tipo de item de `content-schema` (ex.: `Pergunta`,
 * `DosagemRow`), duas coisas dariam errado: (1) a tarefa
 * `content-schema/definir-schemas-secoes` já fechou os 11 esquemas e migrou
 * o conteúdo inicial sem esse campo — mexer nela agora estaria fora do
 * escopo desta tarefa (`api/dominio-esquemas-e-regras`); e (2) os esquemas
 * Zod de `content-schema` usam `z.object({...})` no modo padrão ("strip"),
 * então gravar `visivel` dentro do mesmo objeto validado por aquele schema
 * seria descartado silenciosamente por qualquer `schema.parse()` — a pior
 * forma de perder um dado. A visibilidade de item é, portanto, **metadado
 * que a API adiciona por cima do conteúdo já validado**, guardado à parte do
 * `data` da seção (mapa de índice → visível), não dentro dele. É o Domínio
 * quem sabe combinar as duas coisas na hora de responder `GET /api/content`
 * — esta função pura é essa combinação.
 */

/**
 * Visibilidade dos itens de lista de uma seção, por campo de lista.
 *
 * Chave: nome do campo de array dentro do `data` da seção que é uma lista
 * (ex.: `"perguntas"` em `faq`, `"dosagem"` em `protocolo`, `"stats"` em
 * `prova_autoridade`, `"items"` em `diferenciais`). Seções sem nenhuma lista
 * (`hero`, `fenotipos`, `mecanismo`, `tecnologia_sis`, `material_tecnico`,
 * `cta_secundario`) nunca têm entrada aqui.
 *
 * Valor: array paralelo à lista correspondente, alinhado por índice — a
 * mesma ausência de identificador estável que os itens já têm em
 * `content-schema` (nenhum tem `id`). Um índice ausente do array, ou `true`,
 * significa "visível" (default seguro: nada some por engano); só `false`
 * remove o item.
 */
export type ItemVisibilityMap = Partial<Record<string, boolean[]>>;

/** Uma seção como o Domínio a recebe para decidir o que expor publicamente. */
export interface SecaoParaFiltragem<TData extends Record<string, unknown> = Record<string, unknown>> {
  /** `content_sections.is_published` — visibilidade da seção inteira. */
  isPublished: boolean;
  /** `content_sections.data`, já validado contra o esquema da seção. */
  data: TData;
}

/**
 * Recebe o conteúdo de uma seção e devolve só os itens de lista marcados
 * como visíveis — a função que `GET /api/content` (pública, ver SDD
 * § Contratos de dados/API/interfaces) usa para nunca vazar uma seção ou
 * item não publicado.
 *
 * @returns `null` se a seção inteira não está publicada (nada a expor); caso
 * contrário, o mesmo `data`, com cada lista referenciada em
 * `itemVisibilityFlags` filtrada para conter só os itens visíveis. Campos
 * que não são listas, e listas sem entrada em `itemVisibilityFlags`,
 * passam inalterados.
 */
export function filtrarConteudoPublicado<TData extends Record<string, unknown>>(
  secao: SecaoParaFiltragem<TData>,
  itemVisibilityFlags: ItemVisibilityMap = {},
): TData | null {
  if (!secao.isPublished) {
    return null;
  }

  const camposComFiltro = Object.keys(itemVisibilityFlags);
  if (camposComFiltro.length === 0) {
    return secao.data;
  }

  const dadoFiltrado: Record<string, unknown> = { ...secao.data };

  for (const campo of camposComFiltro) {
    const valorOriginal = dadoFiltrado[campo];
    const flags = itemVisibilityFlags[campo];
    if (!Array.isArray(valorOriginal) || flags === undefined) {
      continue;
    }
    dadoFiltrado[campo] = valorOriginal.filter(
      (_item, indice) => flags[indice] !== false,
    );
  }

  return dadoFiltrado as TData;
}
