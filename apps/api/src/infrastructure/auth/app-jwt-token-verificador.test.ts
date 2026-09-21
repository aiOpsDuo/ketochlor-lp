import { SignJWT } from 'jose';
import { describe, expect, it } from 'vitest';
import { AppJwtEmissorToken } from './app-jwt';
import { AppJwtTokenVerificador } from './app-jwt-token-verificador';
import type { AuthJwtEnv } from '../config/auth-jwt-env';

/**
 * Testes REAIS de round-trip: assina com `AppJwtEmissorToken` (o emissor
 * desta mesma tarefa) e verifica com `AppJwtTokenVerificador` — nunca um
 * token fabricado à mão para o caminho feliz, mesmo padrão de
 * `jwks-token-verificador.test.ts` (que usava login real do Supabase; aqui o
 * "real" é a própria emissão da aplicação, já que não há mais um serviço de
 * terceiro envolvido).
 */
describe('AppJwtTokenVerificador (infra)', () => {
  const env: AuthJwtEnv = {
    secret: 'segredo-de-teste-com-pelo-menos-32-caracteres',
    expiresIn: '1h',
  };
  const emissor = new AppJwtEmissorToken(env);
  const verificador = new AppJwtTokenVerificador(env);

  it('aceita um JWT válido emitido por AppJwtEmissorToken, com o sub e as claims corretas', async () => {
    const token = await emissor.emitir({ sub: 'operador-123', email: 'ana@example.com' });

    const resultado = await verificador.verificar(token);

    expect(resultado.valido).toBe(true);
    if (resultado.valido) {
      expect(resultado.claims.sub).toBe('operador-123');
      expect(resultado.claims.email).toBe('ana@example.com');
    }
  });

  it('rejeita um token com assinatura adulterada', async () => {
    const token = await emissor.emitir({ sub: 'operador-123' });
    const partes = token.split('.');
    const assinaturaAdulterada = partes[2].slice(0, -4) + 'AAAA';
    const tokenAdulterado = `${partes[0]}.${partes[1]}.${assinaturaAdulterada}`;

    const resultado = await verificador.verificar(tokenAdulterado);

    expect(resultado.valido).toBe(false);
  });

  it('rejeita um token expirado', async () => {
    const tokenExpirado = await new SignJWT({ sub: 'operador-123' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(new TextEncoder().encode(env.secret));

    const resultado = await verificador.verificar(tokenExpirado);

    expect(resultado.valido).toBe(false);
    if (!resultado.valido) {
      expect(resultado.motivo.toLowerCase()).toContain('exp');
    }
  });

  it('rejeita um token assinado com um segredo diferente', async () => {
    const outroVerificador = new AppJwtTokenVerificador({
      secret: 'um-segredo-completamente-diferente-32-caracteres',
      expiresIn: '1h',
    });
    const token = await emissor.emitir({ sub: 'operador-123' });

    const resultado = await outroVerificador.verificar(token);

    expect(resultado.valido).toBe(false);
  });

  it('rejeita um token malformado', async () => {
    const resultado = await verificador.verificar('isto-nao-e-um-jwt');

    expect(resultado.valido).toBe(false);
  });
});
