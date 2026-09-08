/**
 * Formato comum de resultado das validações de Domínio (validação de conteúdo
 * de seção e invariantes do lead). Um `ResultadoValidacao` nunca é lançado
 * como exceção — é a Apresentação (ainda inexistente, ver SDD § Camadas e
 * padrão arquitetural) quem decide como traduzir uma falha em resposta HTTP
 * (ex.: `422` com a lista de erros). O Domínio só sabe dizer "sim" ou "não,
 * e por quê" — nunca conhece HTTP.
 */
export interface ErroValidacaoCampo {
  /** Nome (ou caminho, ex.: "dosagem.0.volumeMl") do campo inválido. */
  campo: string;
  /** Mensagem de erro legível, já pronta para exibição ao operador. */
  mensagem: string;
}

export type ResultadoValidacao<T> =
  | { sucesso: true; dado: T }
  | { sucesso: false; erros: ErroValidacaoCampo[] };
