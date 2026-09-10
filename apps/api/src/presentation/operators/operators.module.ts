import { Module, type Provider } from '@nestjs/common';
import { CriarOperadorUseCase } from '../../application/operators/criar-operador.use-case';
import { ListarOperadoresUseCase } from '../../application/operators/listar-operadores.use-case';
import { OPERADORES_REPOSITORY } from '../../application/operators/operadores-repository.token';
import { RemoverOperadorUseCase } from '../../application/operators/remover-operador.use-case';
import {
  carregarSupabaseEnv,
  criarSupabaseAdminClient,
  SupabaseOperadoresRepository,
} from '../../infrastructure';
import { OperatorsAdminController } from './operators-admin.controller';

/**
 * Liga a porta `OperadoresRepository` (Domínio) à implementação concreta
 * `SupabaseOperadoresRepository` (Infraestrutura, Supabase Auth Admin API,
 * sem tabela própria) — mesmo padrão de `presentation/metadata/metadata.module.ts`
 * para `SITE_METADATA_REPOSITORY`.
 */
const operadoresRepositoryProvider: Provider = {
  provide: OPERADORES_REPOSITORY,
  useFactory: () => {
    const env = carregarSupabaseEnv();
    const client = criarSupabaseAdminClient(env);
    return new SupabaseOperadoresRepository(client);
  },
};

/**
 * Módulo de operadores (PLAN.md, tarefa `ajustes/modulo-operadores`):
 * `GET`/`POST /api/admin/operators`, `DELETE /api/admin/operators/:id`,
 * protegidas pelo `AuthGuard` global de `AuthModule` (sem precisar importá-lo
 * aqui — o guard é global via `APP_GUARD`).
 */
@Module({
  controllers: [OperatorsAdminController],
  providers: [operadoresRepositoryProvider, ListarOperadoresUseCase, CriarOperadorUseCase, RemoverOperadorUseCase],
})
export class OperatorsModule {}
