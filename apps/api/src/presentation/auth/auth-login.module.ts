import { Module, type Provider } from '@nestjs/common';
import { LoginUseCase } from '../../application/auth/login.use-case';
import { EMISSOR_TOKEN } from '../../application/auth/emissor-token.token';
import { AppJwtEmissorToken } from '../../infrastructure/auth/app-jwt';
import { carregarAuthJwtEnv } from '../../infrastructure/config/auth-jwt-env';
import { OperatorsModule } from '../operators/operators.module';
import { AuthLoginController } from './auth-login.controller';

/** Liga a porta `EmissorToken` (Domínio) a `AppJwtEmissorToken` (Infraestrutura, `jose`, `AUTH_JWT_SECRET`). */
const emissorTokenProvider: Provider = {
  provide: EMISSOR_TOKEN,
  useFactory: () => new AppJwtEmissorToken(carregarAuthJwtEnv()),
};

/**
 * Módulo de login (PLAN.md, tarefa
 * `ajustes/migracao-mysql-modulo-auth-proprio`): `POST /api/auth/login`,
 * pública (fora de `/api/admin/*`, ver `AuthLoginController`).
 *
 * Importa `OperatorsModule` para resolver `OPERADOR_CREDENCIAIS_REPOSITORY`
 * (exportado de lá, ligado à MESMA instância de `MySqlOperadoresRepository`
 * usada por `OPERADORES_REPOSITORY`) em vez de instanciar um segundo pool —
 * mesmo padrão de `ContentModule` importando `MetadataModule` para
 * `SITE_METADATA_REPOSITORY`.
 *
 * Desde a tarefa `ajustes/migracao-mysql-cutover-wiring`, importado em
 * `AppModule` — os outros cinco módulos (`content`/`media`/`leads`/
 * `metadata`/`operators`) já servem inteiramente pelos adaptadores MySQL/
 * MinIO (ver comentário de topo de `infrastructure/index.ts`), então
 * `AUTH_JWT_SECRET`/`MYSQL_*`/`MINIO_*` já são variáveis obrigatórias do
 * `docker compose up` da `api` de qualquer forma — nenhum ambiente novo fica
 * quebrado por este módulo passar a ser servido de verdade.
 */
@Module({
  imports: [OperatorsModule],
  controllers: [AuthLoginController],
  providers: [emissorTokenProvider, LoginUseCase],
})
export class AuthLoginModule {}
