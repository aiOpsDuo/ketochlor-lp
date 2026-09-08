/**
 * Erro de domínio — não é uma exceção HTTP. `key` recebido não é um dos 11
 * identificadores fechados de seção do CMS (SDD § Linguagem ubíqua —
 * "Seção"; § Modelo de dados). A tradução para `4xx` é responsabilidade da
 * camada de Apresentação (ainda inexistente nesta tarefa), que captura este
 * erro e decide o status/formato de resposta.
 */
export class ChaveSecaoInvalidaError extends Error {
  constructor(public readonly chaveRecebida: string) {
    super(`"${chaveRecebida}" não é uma das 11 seções fechadas do CMS.`);
    this.name = 'ChaveSecaoInvalidaError';
  }
}
