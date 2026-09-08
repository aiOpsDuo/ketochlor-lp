import { Module, type Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { carregarSupabaseEnv, JwksTokenVerificador } from '../../infrastructure';
import { AuthGuard } from './auth.guard';
import { VERIFICADOR_TOKEN } from './verificador-token.token';

/**
 * Liga a porta `VerificadorToken` (Domínio) à implementação concreta
 * `JwksTokenVerificador` (Infraestrutura), configurada a partir de
 * `carregarSupabaseEnv()` — este é o único ponto do código que decide QUAL
 * implementação satisfaz a porta (Injeção de Dependência via Nest).
 */
const verificadorTokenProvider: Provider = {
  provide: VERIFICADOR_TOKEN,
  useFactory: () => {
    const env = carregarSupabaseEnv();
    return new JwksTokenVerificador({ jwtSecret: env.jwtSecret, jwksUrl: env.jwksUrl });
  },
};

/**
 * Registra `AuthGuard` GLOBALMENTE (`APP_GUARD`) — ver comentário de decisão
 * em `auth.guard.ts` sobre por que "global + checagem de prefixo dentro do
 * guard" é a forma escolhida de proteger `/api/admin/*` sem depender de
 * anotação por controller.
 */
@Module({
  providers: [verificadorTokenProvider, { provide: APP_GUARD, useClass: AuthGuard }],
  exports: [verificadorTokenProvider],
})
export class AuthModule {}
