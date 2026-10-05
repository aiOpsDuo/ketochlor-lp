/**
 * Montagem de padrão para `LIKE` do MySQL a partir de texto digitado por
 * quem usa o painel (ex. busca de lead por e-mail, `FiltroLeads.email`).
 *
 * O texto sempre vai como PARÂMETRO da consulta (`?`, nunca concatenado no
 * SQL) — isso já impede injeção de SQL. O que o parâmetro sozinho NÃO impede
 * é que `%`/`_` digitados virem curingas do próprio `LIKE` (`maria_` casaria
 * `mariaX`): por isso os dois, e o caractere de escape `\`, são escapados
 * aqui, para casarem literalmente. A consulta declara o caractere de escape
 * explicitamente (`CLAUSULA_ESCAPE_LIKE`) em vez de depender do default
 * implícito do `LIKE`, para quem lê o SQL ver qual é.
 */

/**
 * Cláusula `ESCAPE` a anexar depois do `LIKE ?`. No texto do SQL o literal é
 * `'\\'` (barra dobrada, sintaxe de string do MySQL) — o valor resultante é
 * um único `\`, o mesmo usado por `escaparParaLike`.
 */
export const CLAUSULA_ESCAPE_LIKE = "ESCAPE '\\\\'";

/** Escapa `\`, `%` e `_` num único passo — cada caractere de entrada é escapado no máximo uma vez. */
export function escaparParaLike(texto: string): string {
  return texto.replace(/[\\%_]/g, (caractere) => `\\${caractere}`);
}

/** Padrão de `LIKE` que casa qualquer valor que CONTENHA `texto`, literalmente. */
export function padraoLikeContem(texto: string): string {
  return `%${escaparParaLike(texto)}%`;
}
