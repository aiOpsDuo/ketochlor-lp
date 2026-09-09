import { z } from 'zod'
import { CONTENT_SECTIONS, imageFieldSchema, type SectionKey } from '@ketochlor/content-schema'

/**
 * Introspecção do schema Zod de uma seção (`@ketochlor/content-schema`) para
 * gerar a lista de campos a renderizar — a tarefa `painel/formulario-edicao-secao`
 * exige um sistema de renderização DIRIGIDO PELO SHAPE do schema, não 11
 * formulários hardcoded nem uma segunda definição de "quais campos a seção X
 * tem" duplicada aqui. As 11 seções reais hoje só usam cinco formas de campo:
 *
 * 1. Texto simples (`z.string()`) → `texto`.
 * 2. O mesmíssimo `imageFieldSchema` reaproveitado por referência em toda
 *    seção com imagem (`hero.logo`, `problema.imagem`, ...) → `imagem`,
 *    detectado por IGUALDADE DE REFERÊNCIA (não por forma), porque é
 *    literalmente a mesma instância de objeto Zod em todas elas.
 * 3. Array de string (só `problema.paragraphs` hoje) → `lista-texto`: uma
 *    lista comum de texto longo dividido em parágrafos, sem visibilidade de
 *    item associada — `ItemVisibilityMap`
 *    (`apps/api/src/domain/visibilidade/filtrar-conteudo-publicado.ts`) só
 *    cobre listas de ITEM de conteúdo (perguntas, linhas de dosagem,
 *    estatísticas, itens comparativos), não um campo de texto que só está
 *    dividido em parágrafos por conveniência de edição.
 * 4. Array de objeto (`prova_autoridade.stats`, `protocolo.dosagem`,
 *    `diferenciais.items`, `faq.perguntas`) → `lista-item`: precisa de
 *    adicionar/remover/reordenar com `ItemVisibilityMap` sincronizado (ver
 *    `../../lib/... list-utils.ts`).
 * 5. Objeto aninhado que não é `imageFieldSchema` (`fenotipos.agudo`/
 *    `.cronico`, `mecanismo.cetoconazol`/`.clorexidina`, `protocolo.closing`)
 *    → `estrutura-fixa`: campos editáveis, cardinalidade fechada, sem
 *    adicionar/remover (SDD § Critérios de aceitação — "Gestão de itens de
 *    lista").
 *
 * Nenhuma das 11 seções hoje aninha uma lista ou uma imagem DENTRO de um item
 * de lista ou de uma subestrutura fixa — por isso os campos de um item/
 * subestrutura são só escalares (texto ou número, ver `CampoEscalarDescritor`).
 * Se uma seção futura precisar disso, esta função (e os componentes que a
 * consomem) precisam crescer — over-engineering evitado de propósito
 * (`references/padroes-codigo.md` — proporcionalidade).
 */
export type TipoEscalar = 'texto' | 'numero'

export interface CampoEscalarDescritor {
  chave: string
  tipo: TipoEscalar
}

export type CampoDescritor =
  | { tipo: 'texto'; chave: string }
  | { tipo: 'imagem'; chave: string }
  | { tipo: 'lista-texto'; chave: string }
  | { tipo: 'lista-item'; chave: string; camposItem: CampoEscalarDescritor[] }
  | { tipo: 'estrutura-fixa'; chave: string; campos: CampoEscalarDescritor[] }

export function descreverCamposDaSecao(key: SectionKey): CampoDescritor[] {
  const { schema } = CONTENT_SECTIONS[key]
  return Object.entries(schema.shape).map(([chave, campo]) =>
    descreverCampo(chave, campo as z.ZodTypeAny),
  )
}

function descreverCampo(chave: string, campo: z.ZodTypeAny): CampoDescritor {
  // Comparação por referência, de propósito (ver comentário do módulo,
  // ponto 2): `imageFieldSchema` é literalmente a mesma instância em toda
  // seção que a usa.
  if ((campo as unknown) === imageFieldSchema) {
    return { tipo: 'imagem', chave }
  }
  if (campo instanceof z.ZodArray) {
    const elemento = campo.element as z.ZodTypeAny
    if (elemento instanceof z.ZodObject) {
      return { tipo: 'lista-item', chave, camposItem: descreverCamposEscalares(elemento) }
    }
    return { tipo: 'lista-texto', chave }
  }
  if (campo instanceof z.ZodObject) {
    return { tipo: 'estrutura-fixa', chave, campos: descreverCamposEscalares(campo) }
  }
  return { tipo: 'texto', chave }
}

function descreverCamposEscalares(schema: z.ZodObject<z.ZodRawShape>): CampoEscalarDescritor[] {
  return Object.entries(schema.shape).map(([chave, campo]) => ({
    chave,
    tipo: campo instanceof z.ZodNumber ? 'numero' : 'texto',
  }))
}

/** Valor inicial de um item novo de lista, a partir dos campos escalares do schema — usado por "Adicionar item". */
export function itemVazio(camposItem: CampoEscalarDescritor[]): Record<string, unknown> {
  const item: Record<string, unknown> = {}
  for (const campo of camposItem) {
    item[campo.chave] = campo.tipo === 'numero' ? 0 : ''
  }
  return item
}
