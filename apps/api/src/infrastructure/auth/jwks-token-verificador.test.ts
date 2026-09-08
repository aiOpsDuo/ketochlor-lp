import { randomUUID } from 'node:crypto';
import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { criarSupabaseAdminClient } from '../supabase/supabase-client.factory';
import { JwksTokenVerificador } from './jwks-token-verificador';
import { ANON_KEY_LOCAL, carregarSupabaseTestEnv } from '../test-support/supabase-test-env';

/**
 * Testes de INTEGRAÇÃO reais: cria um usuário de teste via Admin API do
 * Supabase local, faz login de verdade (e-mail/senha) para obter um JWT
 * genuíno emitido pelo Auth local, e verifica esse token com
 * `JwksTokenVerificador` — nunca um token fabricado à mão para o caminho
 * feliz (só para os casos de rejeição, onde um token real não serviria).
 */
describe('JwksTokenVerificador (infra)', () => {
  const email = `operador.teste.${randomUUID()}@example.com`;
  const senha = 'senha-de-teste-123456';

  let adminClient: SupabaseClient;
  let anonClient: SupabaseClient;
  let verificador: JwksTokenVerificador;
  let jwtSecret: string;
  let userId: string;

  beforeAll(async () => {
    const env = carregarSupabaseTestEnv();
    if (!env.jwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET precisa estar definido para os testes do caminho HS256.');
    }
    if (!env.jwksUrl) {
      throw new Error('SUPABASE_JWKS_URL precisa estar definido para os testes do caminho assimétrico (login real).');
    }
    jwtSecret = env.jwtSecret;

    adminClient = criarSupabaseAdminClient(env);
    anonClient = createClient(env.url, ANON_KEY_LOCAL);
    // Configurado com os dois: o login real contra o Supabase local emite
    // ES256 (verificado em `npx supabase start`, ver comentário de decisão em
    // jwks-token-verificador.ts), então precisa de `jwksUrl`; os testes de
    // rejeição abaixo fabricam tokens HS256 deliberadamente, para exercitar
    // também o caminho de segredo compartilhado (projetos legados).
    verificador = new JwksTokenVerificador({ jwtSecret, jwksUrl: env.jwksUrl });

    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
    });
    if (error || !data.user) {
      throw new Error(`Falha ao criar usuário de teste: ${error?.message}`);
    }
    userId = data.user.id;
  });

  afterAll(async () => {
    if (userId) {
      await adminClient.auth.admin.deleteUser(userId);
    }
  });

  it('aceita um JWT válido, emitido pelo Supabase Auth local via login real', async () => {
    const { data, error } = await anonClient.auth.signInWithPassword({ email, password: senha });
    if (error || !data.session) {
      throw new Error(`Falha ao autenticar usuário de teste: ${error?.message}`);
    }

    const resultado = await verificador.verificar(data.session.access_token);

    expect(resultado.valido).toBe(true);
    if (resultado.valido) {
      expect(resultado.claims.sub).toBe(userId);
      expect(resultado.claims.email).toBe(email);
    }
  });

  it('rejeita um token com assinatura adulterada', async () => {
    const { data, error } = await anonClient.auth.signInWithPassword({ email, password: senha });
    if (error || !data.session) {
      throw new Error(`Falha ao autenticar usuário de teste: ${error?.message}`);
    }

    const partes = data.session.access_token.split('.');
    const assinaturaAdulterada = partes[2].slice(0, -4) + 'AAAA';
    const tokenAdulterado = `${partes[0]}.${partes[1]}.${assinaturaAdulterada}`;

    const resultado = await verificador.verificar(tokenAdulterado);

    expect(resultado.valido).toBe(false);
  });

  it('rejeita um token expirado', async () => {
    const tokenExpirado = await new SignJWT({ sub: userId, role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(new TextEncoder().encode(jwtSecret));

    const resultado = await verificador.verificar(tokenExpirado);

    expect(resultado.valido).toBe(false);
    if (!resultado.valido) {
      expect(resultado.motivo.toLowerCase()).toContain('exp');
    }
  });

  it('rejeita um token assinado com um segredo diferente', async () => {
    const tokenComSegredoErrado = await new SignJWT({ sub: userId, role: 'authenticated' })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(new TextEncoder().encode('segredo-completamente-diferente-32-caracteres'));

    const resultado = await verificador.verificar(tokenComSegredoErrado);

    expect(resultado.valido).toBe(false);
  });
});
