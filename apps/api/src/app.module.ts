import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { ContentModule } from './presentation/content/content.module';
import { AuthModule } from './presentation/auth/auth.module';
import { MetadataModule } from './presentation/metadata/metadata.module';

@Module({
  // `HealthModule` continua fora de qualquer guard — `AuthGuard` (registrado
  // globalmente por `AuthModule`) só exige token para rotas sob
  // `/api/admin/*` (ver `presentation/auth/auth.guard.ts`).
  // `MetadataModule` listado explicitamente aqui (peer de `ContentModule`,
  // um módulo por domínio — SDD § Camadas e padrão arquitetural), mesmo já
  // sendo alcançado transitivamente via `ContentModule.imports` — o Nest
  // trata módulos importados por mais de um caminho como singleton, então
  // isso não duplica nenhum provider.
  imports: [HealthModule, AuthModule, MetadataModule, ContentModule],
})
export class AppModule {}
