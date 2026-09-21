/**
 * Token de injeção do Nest para a porta `OperadorCredenciaisRepository`
 * (Domínio) — mesmo motivo de existir do `OPERADORES_REPOSITORY`
 * (`application/operators/operadores-repository.token.ts`): uma interface
 * TypeScript não existe em runtime. Símbolo DIFERENTE de
 * `OPERADORES_REPOSITORY` de propósito — as duas portas são independentes
 * (ver comentário de decisão em `operador-credenciais.repository.ts`), então
 * têm tokens de injeção independentes, mesmo as duas sendo implementadas
 * pela mesma classe concreta (`MySqlOperadoresRepository`).
 */
export const OPERADOR_CREDENCIAIS_REPOSITORY = Symbol('OperadorCredenciaisRepository');
