import { SignJWT } from 'jose';
import type { ClaimsEmissao, EmissorToken } from '../../domain/portas/emissor-token';
import type { AuthJwtEnv } from '../config/auth-jwt-env';

/**
 * Emite um JWT assinado (HS256, segredo próprio da aplicação) — o lado
 * "emitir" da autenticação própria, complementar a `AppJwtTokenVerificador`
 * (mesma pasta, lado "verificar"). Único consumidor: `LoginUseCase`
 * (`application/auth/login.use-case.ts`), via a porta `EmissorToken`
 * (Domínio) — nunca instanciado diretamente por uma camada acima da
 * Infraestrutura (mesma regra de dependência do resto do projeto).
 *
 * Decisão de biblioteca: `jose` (`SignJWT`) — já é dependência do projeto
 * (usada por `JwksTokenVerificador`) só para VERIFICAR; confirmado via
 * Context7/documentação oficial que `SignJWT` é a API companion da mesma
 * biblioteca para EMITIR, evitando introduzir uma segunda dependência
 * (`jsonwebtoken` ou similar) só para o lado de emissão.
 */
export class AppJwtEmissorToken implements EmissorToken {
  private readonly segredo: Uint8Array;

  constructor(private readonly env: AuthJwtEnv) {
    this.segredo = new TextEncoder().encode(env.secret);
  }

  async emitir(claims: ClaimsEmissao): Promise<string> {
    const { sub, ...outrasClaims } = claims;
    return new SignJWT(outrasClaims)
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject(sub)
      .setIssuedAt()
      .setExpirationTime(this.env.expiresIn)
      .sign(this.segredo);
  }
}
