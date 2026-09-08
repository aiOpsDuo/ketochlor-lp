import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { ContentModule } from './presentation/content/content.module';
import { AuthModule } from './presentation/auth/auth.module';

@Module({
  // `HealthModule` continua fora de qualquer guard — `AuthGuard` (registrado
  // globalmente por `AuthModule`) só exige token para rotas sob
  // `/api/admin/*` (ver `presentation/auth/auth.guard.ts`).
  imports: [HealthModule, AuthModule, ContentModule],
})
export class AppModule {}
