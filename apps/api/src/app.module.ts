import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { ContentModule } from './presentation/content/content.module';
import { AuthModule } from './presentation/auth/auth.module';
import { AuthLoginModule } from './presentation/auth/auth-login.module';
import { LeadsModule } from './presentation/leads/leads.module';
import { MediaModule } from './presentation/media/media.module';
import { MetadataModule } from './presentation/metadata/metadata.module';
import { OperatorsModule } from './presentation/operators/operators.module';

@Module({
  // `HealthModule` e `AuthLoginModule` (`POST /api/auth/login`) continuam
  // fora de qualquer guard — `AuthGuard` (registrado globalmente por
  // `AuthModule`) só exige token para rotas sob `/api/admin/*` (ver
  // `presentation/auth/auth.guard.ts`).
  // `MetadataModule`/`MediaModule`/`LeadsModule`/`OperatorsModule` listados
  // explicitamente aqui (peers de `ContentModule`, um módulo por domínio —
  // SDD § Camadas e padrão arquitetural); `MetadataModule` também é alcançado
  // transitivamente via `ContentModule.imports`, e `OperatorsModule`
  // transitivamente via `AuthLoginModule.imports` (ver comentário de decisão
  // naquele módulo) — o Nest trata módulos importados por mais de um caminho
  // como singleton, então isso não duplica nenhum provider.
  imports: [
    HealthModule,
    AuthModule,
    AuthLoginModule,
    MetadataModule,
    ContentModule,
    MediaModule,
    LeadsModule,
    OperatorsModule,
  ],
})
export class AppModule {}
