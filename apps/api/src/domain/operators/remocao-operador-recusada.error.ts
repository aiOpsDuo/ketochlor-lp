/** Motivo da recusa de `RemoverOperadorUseCase` — ver comentário da classe abaixo. */
export type MotivoRecusaRemocaoOperador = 'proprio' | 'ultimo-operador';

/**
 * Erro de domínio (mesmo padrão de `ChaveSecaoInvalidaError`,
 * `domain/content/chave-secao-invalida.error.ts`: estende `Error`, guarda o
 * dado relevante como propriedade pública readonly, nunca é uma
 * `HttpException`) lançado por `RemoverOperadorUseCase` quando a remoção
 * violaria uma das duas invariantes que travariam o próprio acesso
 * administrativo ao painel (PLAN.md, tarefa `ajustes/modulo-operadores`):
 *
 * - `'proprio'`: o operador está tentando remover a própria conta — a sessão
 *   de quem chama ficaria autenticada com um usuário que acabou de deixar de
 *   existir.
 * - `'ultimo-operador'`: só resta um operador no Supabase Auth — removê-lo
 *   deixaria o painel sem nenhuma conta capaz de logar.
 *
 * Traduzido pela Apresentação (`OperatorsAdminController`) para `409
 * Conflict`, mesmo padrão de captura de erro de domínio já usado em
 * `ContentAdminController` para `ChaveSecaoInvalidaError`.
 */
export class RemocaoOperadorRecusadaError extends Error {
  constructor(public readonly motivo: MotivoRecusaRemocaoOperador) {
    super(
      motivo === 'proprio'
        ? 'Você não pode remover a própria conta.'
        : 'Não é possível remover o único operador restante.',
    );
    this.name = 'RemocaoOperadorRecusadaError';
  }
}
