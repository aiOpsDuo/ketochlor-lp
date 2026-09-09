/**
 * Operações de lista compartilhadas por `ItemListFieldEditor` (listas de
 * item, com `ItemVisibilityMap`) e `StringListFieldEditor` (`paragraphs`,
 * sem visibilidade de item). Extraídas aqui para as duas nunca reimplementar
 * a mesma troca/remoção de índice (G5) — e, principalmente, para o chamador
 * poder aplicar EXATAMENTE a mesma operação (mesmo índice, mesma direção) ao
 * array de conteúdo e ao array paralelo de `itemVisibility`, o jeito mais
 * simples de garantir que os dois nunca dessincronizem ao reordenar/remover
 * (SDD/PLAN.md — nota de design sobre `ItemVisibilityMap` ser um array
 * alinhado por ÍNDICE, sem `id` estável de item).
 */

/** Troca o item de `indice` com seu vizinho na direção informada; não faz nada se o vizinho não existir (já na borda). */
export function moverIndice<T>(lista: T[], indice: number, direcao: -1 | 1): T[] {
  const alvo = indice + direcao
  if (alvo < 0 || alvo >= lista.length) {
    return lista
  }
  const copia = [...lista]
  const troca = copia[indice]
  copia[indice] = copia[alvo]
  copia[alvo] = troca
  return copia
}

export function removerIndice<T>(lista: T[], indice: number): T[] {
  return lista.filter((_item, i) => i !== indice)
}
