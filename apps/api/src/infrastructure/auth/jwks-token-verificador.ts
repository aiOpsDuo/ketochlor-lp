import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTVerifyGetKey } from 'jose';
import type {
  ClaimsUsuarioAutenticado,
  ResultadoVerificacaoToken,
  VerificadorToken,
} from '../../domain/portas/verificador-token';

export interface JwksTokenVerificadorConfig {
  /** Segredo HS256 legado (`GOTRUE_JWT_SECRET`) — obrigatório se `jwksUrl` não for informado. */
  jwtSecret?: string;
  /** URL do JWKS do projeto — obrigatório se `jwtSecret` não for informado. */
  jwksUrl?: string;
}

/**
 * Verifica um JWT emitido pelo Supabase Auth.
 *
 * Decisão de biblioteca (confirmada via Context7 antes de escrever):
 * `jose` — `createRemoteJWKSet` + `jwtVerify` é a forma hoje recomendada no
 * ecossistema Node para verificar contra JWKS remoto, sem estado de servidor
 * (alternativa descartada: `jsonwebtoken` + `jwks-rsa`, API mais antiga, dois
 * pacotes para o mesmo trabalho que `jose` cobre sozinho).
 *
 * Decisão de estratégia HS256 vs. JWKS — também confirmada via Context7, pela
 * documentação do próprio `supabase/auth` (GoTrue) e verificada empiricamente
 * contra o Supabase CLI local usado nos testes desta tarefa: a versão da CLI
 * em uso já emite, por padrão, chaves de assinatura assimétricas (`ES256`,
 * publicadas em `/auth/v1/.well-known/jwks.json`) — não o segredo HS256
 * legado. Um projeto mais antigo (ou uma instância self-hosted sem migrar as
 * chaves) ainda pode emitir `HS256` com o segredo compartilhado
 * (`GOTRUE_JWT_SECRET`/`SUPABASE_JWT_SECRET`). Por isso este verificador é
 * híbrido: olha o header `alg` do token (sem validar a assinatura ainda) e
 * escolhe a estratégia certa — segredo compartilhado para `HS*`, JWKS remoto
 * para qualquer outro algoritmo. As duas estratégias são as mesmas que a
 * própria documentação do Supabase descreve para verificação server-side de
 * JWTs simétricos e assimétricos.
 */
export class JwksTokenVerificador implements VerificadorToken {
  private readonly segredoCompartilhado?: Uint8Array;
  private readonly jwks?: JWTVerifyGetKey;

  constructor(config: JwksTokenVerificadorConfig) {
    if (!config.jwtSecret && !config.jwksUrl) {
      throw new Error(
        'JwksTokenVerificador exige "jwtSecret" (HS256) ou "jwksUrl" (chave assimétrica) — nenhum dos dois foi informado.',
      );
    }
    this.segredoCompartilhado = config.jwtSecret
      ? new TextEncoder().encode(config.jwtSecret)
      : undefined;
    this.jwks = config.jwksUrl ? createRemoteJWKSet(new URL(config.jwksUrl)) : undefined;
  }

  async verificar(token: string): Promise<ResultadoVerificacaoToken> {
    let algoritmo: string | undefined;
    try {
      ({ alg: algoritmo } = decodeProtectedHeader(token));
    } catch {
      return { valido: false, motivo: 'Token malformado: header JWT não pôde ser decodificado.' };
    }

    const usaSegredoCompartilhado = algoritmo?.startsWith('HS') ?? false;

    try {
      if (usaSegredoCompartilhado) {
        if (!this.segredoCompartilhado) {
          return {
            valido: false,
            motivo:
              'Token assinado com HS256, mas "SUPABASE_JWT_SECRET" não está configurado nesta instância.',
          };
        }
        const { payload } = await jwtVerify(token, this.segredoCompartilhado);
        return { valido: true, claims: payload as ClaimsUsuarioAutenticado };
      }

      if (!this.jwks) {
        return {
          valido: false,
          motivo: `Token assinado com "${algoritmo}", mas "SUPABASE_JWKS_URL" não está configurado nesta instância.`,
        };
      }
      const { payload } = await jwtVerify(token, this.jwks);
      return { valido: true, claims: payload as ClaimsUsuarioAutenticado };
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : 'Token inválido.';
      return { valido: false, motivo };
    }
  }
}
