import { Module, type Provider } from '@nestjs/common';
import { AtualizarMetadataUseCase } from '../../application/metadata/atualizar-metadata.use-case';
import { ConsultarMetadataUseCase } from '../../application/metadata/consultar-metadata.use-case';
import { SITE_METADATA_REPOSITORY } from '../../application/metadata/site-metadata-repository.token';
import {
  carregarMysqlEnv,
  criarMysqlPool,
  MySqlSiteMetadataRepository,
} from '../../infrastructure';
import { MetadataAdminController } from './metadata-admin.controller';

/**
 * Liga a porta `SiteMetadataRepository` (Domínio) à implementação concreta
 * `MySqlSiteMetadataRepository` (Infraestrutura, MySQL real, tabela
 * `site_metadata`) — mesmo padrão de `presentation/content/content.module.ts`
 * para `CONTENT_SECTIONS_REPOSITORY` (SDD § "Migração de plataforma de
 * dados").
 */
const siteMetadataRepositoryProvider: Provider = {
  provide: SITE_METADATA_REPOSITORY,
  useFactory: () => {
    const env = carregarMysqlEnv();
    const pool = criarMysqlPool(env);
    return new MySqlSiteMetadataRepository(pool);
  },
};

/**
 * Módulo de metadados (tarefa `api/modulo-metadata`): `GET`/`PUT
 * /api/admin/metadata`, protegidas pelo `AuthGuard` global de `AuthModule`
 * (sem precisar importá-lo aqui — o guard é global via `APP_GUARD`).
 *
 * Exporta `siteMetadataRepositoryProvider` (mesmo padrão de
 * `AuthModule.exports` para `verificadorTokenProvider`) para que
 * `ContentModule` possa importar este módulo e resolver
 * `SITE_METADATA_REPOSITORY` — `ConsultarConteudoPublicadoUseCase` (`GET
 * /api/content`) passou a depender desta porta para compor `{ sections,
 * metadata }` (SDD § Contratos de dados/API/interfaces), e a porta não deve
 * ser instanciada duas vezes (uma por módulo) só para evitar um `import`
 * entre módulos — isso duplicaria a fábrica do pool MySQL sem necessidade
 * real (viola G5/DRY de `references/clean-code.md`).
 */
@Module({
  controllers: [MetadataAdminController],
  providers: [siteMetadataRepositoryProvider, ConsultarMetadataUseCase, AtualizarMetadataUseCase],
  exports: [siteMetadataRepositoryProvider],
})
export class MetadataModule {}
