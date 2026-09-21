import type { ErroValidacaoCampo, ResultadoValidacao } from '../shared/resultado-validacao';

/**
 * Corpo aceito de `POST /api/auth/login` (SDD § Contratos de dados/API/
 * interfaces — Autenticação; PLAN.md, tarefa
 * `ajustes/migracao-mysql-modulo-auth-proprio`). Mesma decisão de validação
 * de `validarCriacaoOperador`/`validarLead`: função pura no Domínio, sem
 * `class-validator`/`class-transformer` nem DTO decorado na Apresentação.
 */
export interface LoginPayloadBruto {
  email: string;
  senha: string;
}

export type LoginValidado = LoginPayloadBruto;

const CAMPO_OBRIGATORIO = (campo: string): ErroValidacaoCampo => ({
  campo,
  mensagem: `O campo "${campo}" é obrigatório.`,
});

/** Mesmo formato de `validarCriacaoOperador` — validação de forma, não de existência da caixa. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validação de FORMATO do corpo de login (`422` se `email`/`senha` faltarem
 * ou `email` não tiver formato razoável) — nunca de CREDENCIAL (e-mail
 * inexistente ou senha errada é `401`, decidido por `LoginUseCase` a partir
 * do resultado de `OperadorCredenciaisRepository.buscarPorEmail` +
 * `bcryptjs.compare`, nunca aqui). Sem checagem de tamanho mínimo de senha
 * — diferente de `validarCriacaoOperador`, que impõe o mínimo na CRIAÇÃO de
 * conta: aqui a senha já existe (ou não) no banco, então um valor curto
 * demais simplesmente não vai bater com nenhum hash, sem precisar de uma
 * regra de formato redundante.
 */
export function validarLogin(payload: LoginPayloadBruto): ResultadoValidacao<LoginValidado> {
  const erros: ErroValidacaoCampo[] = [];

  const email = payload.email?.trim() ?? '';
  if (email.length === 0) {
    erros.push(CAMPO_OBRIGATORIO('email'));
  } else if (!EMAIL_REGEX.test(email)) {
    erros.push({ campo: 'email', mensagem: 'O e-mail informado não é válido.' });
  }

  // `senha` nunca é aparada (`trim`) — mesma decisão de `validarCriacaoOperador`:
  // um espaço deliberado nas pontas é um caractere de senha válido como outro
  // qualquer.
  const senha = payload.senha ?? '';
  if (senha.length === 0) {
    erros.push(CAMPO_OBRIGATORIO('senha'));
  }

  if (erros.length > 0) {
    return { sucesso: false, erros };
  }

  return { sucesso: true, dado: { email, senha } };
}
