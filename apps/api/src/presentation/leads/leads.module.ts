import { Module, type Provider } from '@nestjs/common';
import { ExcluirLeadUseCase } from '../../application/leads/excluir-lead.use-case';
import { ExportarLeadsCsvUseCase } from '../../application/leads/exportar-leads-csv.use-case';
import { LEADS_REPOSITORY } from '../../application/leads/leads-repository.token';
import { ListarLeadsUseCase } from '../../application/leads/listar-leads.use-case';
import { RegistrarLeadUseCase } from '../../application/leads/registrar-lead.use-case';
import {
  carregarSupabaseEnv,
  criarSupabaseAdminClient,
  SupabaseLeadsRepository,
} from '../../infrastructure';
import { LeadsAdminController } from './leads-admin.controller';
import { LeadsPublicController } from './leads-public.controller';

/**
 * Liga a porta `LeadsRepository` (Domínio) à implementação concreta
 * `SupabaseLeadsRepository` (Infraestrutura) — mesmo padrão de
 * `presentation/metadata/metadata.module.ts` para `SITE_METADATA_REPOSITORY`.
 */
const leadsRepositoryProvider: Provider = {
  provide: LEADS_REPOSITORY,
  useFactory: () => {
    const env = carregarSupabaseEnv();
    const client = criarSupabaseAdminClient(env);
    return new SupabaseLeadsRepository(client);
  },
};

/**
 * Módulo de leads (tarefa `api/modulo-leads`, última da fase `api`):
 * `POST /api/leads` (público) + `GET`/`DELETE /api/admin/leads*`
 * (protegidas pelo `AuthGuard` global de `AuthModule`, sem precisar
 * importá-lo aqui — o guard é global via `APP_GUARD`, não escopado a módulo).
 */
@Module({
  controllers: [LeadsPublicController, LeadsAdminController],
  providers: [
    leadsRepositoryProvider,
    RegistrarLeadUseCase,
    ListarLeadsUseCase,
    ExportarLeadsCsvUseCase,
    ExcluirLeadUseCase,
  ],
})
export class LeadsModule {}
