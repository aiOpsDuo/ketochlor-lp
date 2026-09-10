import type { ErroValidacaoCampo, ResultadoValidacao } from '../shared/resultado-validacao';

/**
 * Corpo aceito de `POST /api/admin/operators` (PLAN.md, tarefa
 * `ajustes/modulo-operadores`). Mesma decisão de validação de
 * `validarLead`/`validarSiteMetadata`: função pura no Domínio, sem
 * `class-validator`/`class-transformer` (não são dependências de `apps/api`)
 * nem DTO decorado na Apresentação.
 */
export interface CriarOperadorPayloadBruto {
  email: string;
  senha: string;
  nome: string;
}

export type CriarOperadorValidado = CriarOperadorPayloadBruto;

const CAMPO_OBRIGATORIO = (campo: string): ErroValidacaoCampo => ({
  campo,
  mensagem: `O campo "${campo}" é obrigatório.`,
});

/** Formato de e-mail razoável — validação de forma, não de existência da caixa (mesmo regex de `validarLead`). */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Mínimo de caracteres da senha — o mínimo do próprio Supabase Auth
 * (`auth.admin.createUser` rejeita senhas mais curtas com erro da própria
 * API), replicado aqui para a API devolver `422` com a lista de erros de
 * campo ANTES de gastar uma chamada à Admin API, em vez de deixar o Supabase
 * rejeitar e a Infraestrutura precisar traduzir um erro de terceiro.
 */
const TAMANHO_MINIMO_SENHA = 6;

/**
 * Invariantes de criação de operador (PLAN.md, tarefa
 * `ajustes/modulo-operadores`): `nome` e `email` obrigatórios e não vazios
 * (após `trim`), `email` em formato razoável, `senha` com pelo menos
 * `TAMANHO_MINIMO_SENHA` caracteres. `senha` nunca é aparada (`trim`) — um
 * espaço deliberado nas pontas é um caractere de senha válido como outro
 * qualquer, diferente de `nome`/`email`, que são texto livre de identificação.
 */
export function validarCriacaoOperador(
  payload: CriarOperadorPayloadBruto,
): ResultadoValidacao<CriarOperadorValidado> {
  const erros: ErroValidacaoCampo[] = [];

  const nome = payload.nome?.trim() ?? '';
  if (nome.length === 0) {
    erros.push(CAMPO_OBRIGATORIO('nome'));
  }

  const email = payload.email?.trim() ?? '';
  if (email.length === 0) {
    erros.push(CAMPO_OBRIGATORIO('email'));
  } else if (!EMAIL_REGEX.test(email)) {
    erros.push({ campo: 'email', mensagem: 'O e-mail informado não é válido.' });
  }

  const senha = payload.senha ?? '';
  if (senha.length === 0) {
    erros.push(CAMPO_OBRIGATORIO('senha'));
  } else if (senha.length < TAMANHO_MINIMO_SENHA) {
    erros.push({
      campo: 'senha',
      mensagem: `A senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`,
    });
  }

  if (erros.length > 0) {
    return { sucesso: false, erros };
  }

  return { sucesso: true, dado: { nome, email, senha } };
}
