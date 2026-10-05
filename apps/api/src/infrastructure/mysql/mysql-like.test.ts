import { describe, expect, it } from 'vitest';
import { escaparParaLike, padraoLikeContem } from './mysql-like';

/**
 * Teste de unidade puro (sem MySQL) do escape de `LIKE`. O efeito real na
 * consulta — `%`/`_` casando literalmente contra o MySQL do compose — é
 * coberto por `leads.repository.test.ts` e `leads.e2e.test.ts`.
 */
describe('mysql-like (infra)', () => {
  it('deixa texto sem caractere especial intacto', () => {
    expect(escaparParaLike('maria@example.com')).toBe('maria@example.com');
  });

  it.each([
    ['%', '\\%'],
    ['_', '\\_'],
    ['\\', '\\\\'],
    ['a_b%c\\d', 'a\\_b\\%c\\\\d'],
  ])('escapa %s como %s', (entrada, esperado) => {
    expect(escaparParaLike(entrada)).toBe(esperado);
  });

  it('não escapa duas vezes uma barra que ele mesmo inseriu', () => {
    // `\_` de entrada: a barra vira `\\` e o `_` vira `\_` — nunca `\\\\_`.
    expect(escaparParaLike('\\_')).toBe('\\\\\\_');
  });

  it('envolve o texto escapado em % para o "contém"', () => {
    expect(padraoLikeContem('maria_')).toBe('%maria\\_%');
  });
});
