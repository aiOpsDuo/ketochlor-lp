/**
 * Porta do Domínio para verificação de sessão (SDD § Decisões técnicas e
 * trade-offs — "Autenticação via Supabase Auth..., token verificado na API
 * via JWKS"; § Contratos de dados/API/interfaces — Autenticação). Ver nota de
 * "Porta do Domínio" em `content-sections.repository.ts`.
 *
 * Implementada pela Infraestrutura (`api/infra-supabase-adapters`); consumida
 * pelo guard de autenticação (`api/modulo-auth`, ainda inexistente) para
 * proteger toda rota `/api/admin/*`.
 */
export interface ClaimsUsuarioAutenticado {
  /** Id do usuário autenticado no Supabase Auth — usado como `updatedBy`/`createdBy` nas escritas. */
  sub: string;
  email?: string;
  role?: string;
  [claim: string]: unknown;
}

export type ResultadoVerificacaoToken =
  | { valido: true; claims: ClaimsUsuarioAutenticado }
  | { valido: false; motivo: string };

export interface VerificadorToken {
  /** Recebe o JWT (sem o prefixo `Bearer `) e devolve as claims, ou o motivo da rejeição — nunca lança exceção para "token inválido". */
  verificar(token: string): Promise<ResultadoVerificacaoToken>;
}
