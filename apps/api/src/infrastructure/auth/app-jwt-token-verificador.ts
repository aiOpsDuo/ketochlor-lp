import { jwtVerify } from 'jose';
import type {
  ClaimsUsuarioAutenticado,
  ResultadoVerificacaoToken,
  VerificadorToken,
} from '../../domain/portas/verificador-token';
import type { AuthJwtEnv } from '../config/auth-jwt-env';

/**
 * Verifica um JWT emitido pela própria aplicação (`AppJwtEmissorToken`,
 * `app-jwt.ts`, mesma pasta) — substitui `JwksTokenVerificador` (que verifica
 * tokens do Supabase Auth) na tarefa `migracao-mysql-cutover-wiring`, ainda
 * não feita (SDD § "Migração de plataforma de dados" → Autenticação).
 *
 * Bem mais simples que `JwksTokenVerificador`: sempre HS256, sempre o mesmo
 * segredo simétrico próprio (`AUTH_JWT_SECRET`) — sem a bifurcação
 * segredo-compartilhado-ou-JWKS-remoto que o Supabase exigia (o Supabase
 * podia emitir HS256 ou ES256 dependendo da versão/projeto; esta aplicação
 * só emite do jeito que ela mesma decide, então não há "outro algoritmo" a
 * suportar). `algorithms: ['HS256']` fixado explicitamente na verificação —
 * nunca aceita um token que alegue outro algoritmo no header (mitigação
 * padrão contra ataque de confusão de algoritmo, ex. `alg: none`).
 */
export class AppJwtTokenVerificador implements VerificadorToken {
  private readonly segredo: Uint8Array;

  constructor(env: AuthJwtEnv) {
    this.segredo = new TextEncoder().encode(env.secret);
  }

  async verificar(token: string): Promise<ResultadoVerificacaoToken> {
    try {
      const { payload } = await jwtVerify(token, this.segredo, { algorithms: ['HS256'] });
      return { valido: true, claims: payload as ClaimsUsuarioAutenticado };
    } catch (erro) {
      const motivo = erro instanceof Error ? erro.message : 'Token inválido.';
      return { valido: false, motivo };
    }
  }
}
