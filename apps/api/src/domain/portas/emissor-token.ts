/**
 * Porta do Domínio para EMISSÃO de sessão (complementar a `VerificadorToken`,
 * que só VERIFICA — ver comentário daquela porta). Nasce com
 * `POST /api/auth/login` (PLAN.md, tarefa
 * `ajustes/migracao-mysql-modulo-auth-proprio`) — a API emite e verifica seu
 * próprio JWT (HS256), sem depender de nenhum serviço de terceiro.
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
