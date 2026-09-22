import { Module, type Provider } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppJwtTokenVerificador, carregarAuthJwtEnv } from '../../infrastructure';
import { AuthGuard } from './auth.guard';
import { VERIFICADOR_TOKEN } from './verificador-token.token';

/**
 * Liga a porta `VerificadorToken` (Domínio) à implementação concreta
 * `AppJwtTokenVerificador` (Infraestrutura), configurada a partir de
 * `carregarAuthJwtEnv()` (`AUTH_JWT_SECRET`, segredo simétrico próprio da
 * aplicação) — este é o único ponto do código que decide QUAL implementação
 * satisfaz a porta (Injeção de Dependência via Nest), ver SDD § "Migração de
 * plataforma de dados" → Autenticação. O `sub` do token é o id do operador.
 */
const verificadorTokenProvider: Provider = {
  provide: VERIFICADOR_TOKEN,
  useFactory: () => new AppJwtTokenVerificador(carregarAuthJwtEnv()),
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
