import { Module } from '@nestjs/common';
import { HealthModule } from './health/health.module';
import { AdminPingModule } from './presentation/admin/admin-ping.module';
import { AuthModule } from './presentation/auth/auth.module';

@Module({
  // `HealthModule` continua fora de qualquer guard — `AuthGuard` (registrado
  // globalmente por `AuthModule`) só exige token para rotas sob
  // `/api/admin/*` (ver `presentation/auth/auth.guard.ts`).
  imports: [HealthModule, AuthModule, AdminPingModule],
})
export class AppModule {}
