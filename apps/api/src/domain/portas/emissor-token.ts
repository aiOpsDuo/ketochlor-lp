/**
 * Porta do Domínio para EMISSÃO de sessão (complementar a `VerificadorToken`,
 * que só VERIFICA — ver comentário daquela porta). Nasce com
 * `POST /api/auth/login` (PLAN.md, tarefa
 * `ajustes/migracao-mysql-modulo-auth-proprio`): antes desta tarefa, a API
 * nunca emitia token nenhum — sessão era inteiramente responsabilidade do
 * Supabase Auth (`signInWithPassword`, fora da API).
 *
 * Interface separada de `VerificadorToken` (ISP): `AuthGuard` só verifica,
 * nunca emite; `LoginUseCase` só emite, nunca verifica. Implementada pela
 * Infraestrutura (`AppJwtEmissorToken`, `infrastructure/auth/app-jwt.ts`).
 */
export interface ClaimsEmissao {
  /** Subject do JWT emitido — `Operador.id` (ver `LoginUseCase`). */
  sub: string;
  [claim: string]: unknown;
}

export interface EmissorToken {
  /** Emite um JWT assinado, sempre com `exp`/`iat`, a partir das claims informadas. */
  emitir(claims: ClaimsEmissao): Promise<string>;
}
