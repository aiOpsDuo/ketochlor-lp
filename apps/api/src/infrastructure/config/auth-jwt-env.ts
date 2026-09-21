/**
 * Leitura das variáveis de ambiente do módulo de autenticação PRÓPRIA da
 * aplicação (SDD § "Migração de plataforma de dados" → Autenticação; PLAN.md,
 * tarefa `ajustes/migracao-mysql-modulo-auth-proprio`) — segredo simétrico
 * PRÓPRIO (`AUTH_JWT_SECRET`), nunca o segredo do Supabase
 * (`SUPABASE_JWT_SECRET`, lido por `supabase-env.ts`/`JwksTokenVerificador`,
 * ainda em uso pelo `AuthGuard` até a tarefa `migracao-mysql-cutover-wiring`).
 *
 * Mesmo estilo de `mysql-env.ts` (leitura + validação descritiva, sem valor
 * hardcoded). `AppJwtTokenVerificador`/`AppJwtEmissorToken`
 * (`infrastructure/auth/`) são os dois únicos consumidores.
 */
export interface AuthJwtEnv {
  /** Segredo HS256 da aplicação — nunca o do Supabase. Recomendado ≥32 caracteres (mesma régua de `SUPABASE_JWT_SECRET`). */
  secret: string;
  /**
   * Validade do token emitido (formato aceito por `jose` — ex. `"8h"`,
   * `"30d"`). Opcional, default `EXPIRACAO_PADRAO` abaixo.
   *
   * Decisão de duração: o painel não tem refresh token nem renovação
   * automática nesta primeira versão (SDD § Painel — o token fica em
   * `localStorage` até expirar ou até logout manual), então uma validade
   * curta obrigaria login repetido num painel de uso interno ocasional
   * (PRD § Premissas). 30 dias equilibra isso contra o risco de um token
   * roubado ficar válido por tempo longo — proporcional a um painel
   * administrativo interno, não uma aplicação voltada ao público.
   */
  expiresIn: string;
}

const EXPIRACAO_PADRAO = '30d';
const TAMANHO_MINIMO_SEGREDO = 32;

function lerObrigatoria(env: NodeJS.ProcessEnv, nome: string): string {
  const valor = env[nome];
  if (!valor) {
    throw new Error(`Variável de ambiente "${nome}" é obrigatória e não foi definida.`);
  }
  return valor;
}

/**
 * @throws {Error} se `AUTH_JWT_SECRET` faltar ou tiver menos de
 * `TAMANHO_MINIMO_SEGREDO` caracteres (HS256 é tão forte quanto o segredo —
 * um segredo curto é adivinhável por força bruta; mesmo mínimo documentado
 * no placeholder de `SUPABASE_JWT_SECRET` em `.env.example`).
 */
export function carregarAuthJwtEnv(env: NodeJS.ProcessEnv = process.env): AuthJwtEnv {
  const secret = lerObrigatoria(env, 'AUTH_JWT_SECRET');
  if (secret.length < TAMANHO_MINIMO_SEGREDO) {
    throw new Error(
      `Variável de ambiente "AUTH_JWT_SECRET" precisa ter pelo menos ${TAMANHO_MINIMO_SEGREDO} caracteres — recebido ${secret.length}.`,
    );
  }

  const expiresIn = env.AUTH_JWT_EXPIRES_IN ?? EXPIRACAO_PADRAO;

  return { secret, expiresIn };
}
