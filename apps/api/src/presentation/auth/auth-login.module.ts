import { Module, type Provider } from '@nestjs/common';
import { LoginUseCase } from '../../application/auth/login.use-case';
import { EMISSOR_TOKEN } from '../../application/auth/emissor-token.token';
import { OPERADOR_CREDENCIAIS_REPOSITORY } from '../../application/auth/operador-credenciais-repository.token';
import { AppJwtEmissorToken } from '../../infrastructure/auth/app-jwt';
import { carregarAuthJwtEnv } from '../../infrastructure/config/auth-jwt-env';
import { carregarMysqlEnv } from '../../infrastructure/config/mysql-env';
import { criarMysqlPool } from '../../infrastructure/mysql/mysql-client.factory';
import { MySqlOperadoresRepository } from '../../infrastructure/mysql/operadores.repository';
import { AuthLoginController } from './auth-login.controller';

/**
 * Liga a porta `OperadorCredenciaisRepository` (Domínio) a
 * `MySqlOperadoresRepository` (Infraestrutura, MySQL real, tabela
 * `operators`) — mesmo padrão de `useFactory` já usado por
 * `OperatorsModule`/`AuthModule`, mas com um pool PRÓPRIO deste módulo (não
 * compartilhado com nenhum outro), já que nenhum outro módulo fala com MySQL
 * ainda.
 */
const operadorCredenciaisRepositoryProvider: Provider = {
  provide: OPERADOR_CREDENCIAIS_REPOSITORY,
  useFactory: () => {
    const env = carregarMysqlEnv();
    const pool = criarMysqlPool(env);
    return new MySqlOperadoresRepository(pool);
  },
};

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
 * **Deliberadamente NÃO importado em `AppModule` ainda.** Esta tarefa cria a
 * rota nova e prova que ela funciona de ponta a ponta (testes de integração
 * reais contra o MySQL do compose + o e2e desta mesma pasta, que sobe só
 * este módulo via `@nestjs/testing`), mas os outros cinco módulos
 * (`content`/`media`/`leads`/`metadata`/`operators`) continuam servindo
 * inteiramente pelos adaptadores Supabase — exatamente como as três tarefas
 * anteriores (`migracao-mysql-adapters-conteudo`,
 * `-adapter-midia-minio`) já haviam criado `MySqlContentSectionsRepository`/
 * `MinioMediaAssetsRepository` etc. sem instanciá-los em nenhum `*.module.ts`
 * (ver comentário de topo de `infrastructure/index.ts`). Importar este módulo
 * em `AppModule` tornaria `AUTH_JWT_SECRET`/`MYSQL_*` variáveis
 * OBRIGATÓRIAS para `docker compose up` da `api` (hoje ela só recebe
 * `SUPABASE_*`, ver `docker-compose.yml`), quebrando qualquer ambiente já no
 * ar (ex. a homologação do usuário) sem aviso — esse é exatamente o "corte
 * de fato" reservado à tarefa futura `migracao-mysql-cutover-wiring`, que
 * também atualiza `docker-compose.yml`/`.env.example` para as novas
 * variáveis. Até lá, este módulo só é instanciado pelos próprios testes
 * (`auth-login.e2e.test.ts`, mesma pasta).
 */
@Module({
  controllers: [AuthLoginController],
  providers: [operadorCredenciaisRepositoryProvider, emissorTokenProvider, LoginUseCase],
})
export class AuthLoginModule {}
