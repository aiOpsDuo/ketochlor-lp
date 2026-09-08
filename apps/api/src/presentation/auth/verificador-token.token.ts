/**
 * Token de injeção do Nest para a porta `VerificadorToken` (Domínio).
 * Interfaces TypeScript não existem em runtime — o Nest precisa de um valor
 * (símbolo, string ou classe) para localizar o provider correto na injeção
 * de dependência. A implementação concreta é ligada a este token em
 * `auth.module.ts`, via `useFactory` que constrói `JwksTokenVerificador`
 * (Infraestrutura) a partir de `carregarSupabaseEnv()`.
 */
export const VERIFICADOR_TOKEN = Symbol('VerificadorToken');
