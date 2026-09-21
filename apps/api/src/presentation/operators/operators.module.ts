import { Module, type Provider } from '@nestjs/common';
import { OPERADOR_CREDENCIAIS_REPOSITORY } from '../../application/auth/operador-credenciais-repository.token';
import { CriarOperadorUseCase } from '../../application/operators/criar-operador.use-case';
import { ListarOperadoresUseCase } from '../../application/operators/listar-operadores.use-case';
import { OPERADORES_REPOSITORY } from '../../application/operators/operadores-repository.token';
import { RemoverOperadorUseCase } from '../../application/operators/remover-operador.use-case';
import { carregarMysqlEnv, criarMysqlPool, MySqlOperadoresRepository } from '../../infrastructure';
import { OperatorsAdminController } from './operators-admin.controller';

/**
 * Liga a porta `OperadoresRepository` (Domínio) à implementação concreta
 * `MySqlOperadoresRepository` (Infraestrutura, MySQL real, tabela
 * `operators`) — mesmo padrão de `presentation/metadata/metadata.module.ts`
 * para `SITE_METADATA_REPOSITORY`. Substitui `SupabaseOperadoresRepository`
 * (tarefa `ajustes/migracao-mysql-cutover-wiring`, SDD § "Migração de
 * plataforma de dados").
 */
const operadoresRepositoryProvider: Provider = {
  provide: OPERADORES_REPOSITORY,
  useFactory: () => {
    const env = carregarMysqlEnv();
    const pool = criarMysqlPool(env);
    return new MySqlOperadoresRepository(pool);
  },
};

/**
 * Liga a porta `OperadorCredenciaisRepository` (Domínio, usada só pelo
 * fluxo de login — `AuthLoginModule`) à MESMA instância acima, via
 * `useExisting` — `MySqlOperadoresRepository` implementa as duas portas
 * (ver comentário de decisão em `operador-credenciais.repository.ts`), e
 * `AuthLoginModule` importa este módulo para reaproveitar este provider em
 * vez de instanciar um segundo pool/uma segunda instância só para o login
 * (G5/DRY de `references/clean-code.md`).
 */
const operadorCredenciaisRepositoryProvider: Provider = {
  provide: OPERADOR_CREDENCIAIS_REPOSITORY,
  useExisting: OPERADORES_REPOSITORY,
};

/**
 * Módulo de operadores (PLAN.md, tarefa `ajustes/modulo-operadores`):
 * `GET`/`POST /api/admin/operators`, `DELETE /api/admin/operators/:id`,
 * protegidas pelo `AuthGuard` global de `AuthModule` (sem precisar importá-lo
 * aqui — o guard é global via `APP_GUARD`).
 *
 * Exporta os dois providers acima (mesmo padrão de `MetadataModule.exports`
 * para `SITE_METADATA_REPOSITORY`) para que `AuthLoginModule` possa importar
 * este módulo e resolver `OPERADOR_CREDENCIAIS_REPOSITORY` sem duplicar a
 * conexão ao MySQL.
 */
@Module({
  controllers: [OperatorsAdminController],
  providers: [
    operadoresRepositoryProvider,
    operadorCredenciaisRepositoryProvider,
    ListarOperadoresUseCase,
    CriarOperadorUseCase,
    RemoverOperadorUseCase,
  ],
  exports: [operadoresRepositoryProvider, operadorCredenciaisRepositoryProvider],
})
export class OperatorsModule {}
