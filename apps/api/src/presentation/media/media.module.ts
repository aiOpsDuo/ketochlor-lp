import { Module, type Provider } from '@nestjs/common';
import { EmitirCredencialUploadUseCase } from '../../application/media/emitir-credencial-upload.use-case';
import { MEDIA_ASSETS_REPOSITORY } from '../../application/media/media-assets-repository.token';
import {
  carregarSupabaseEnv,
  criarSupabaseAdminClient,
  SupabaseMediaAssetsRepository,
} from '../../infrastructure';
import { MediaAdminController } from './media-admin.controller';

/**
 * Liga a porta `MediaAssetsRepository` (Domínio) à implementação concreta
 * `SupabaseMediaAssetsRepository` (Infraestrutura, tarefa
 * `api/infra-supabase-adapters`) — mesmo padrão de
 * `presentation/metadata/metadata.module.ts` para `SITE_METADATA_REPOSITORY`.
 * O bucket vem de `SupabaseEnv.storageBucket` (`SUPABASE_STORAGE_BUCKET`,
 * default `images`) — a mesma variável já documentada em `docs/API.md`.
 */
const mediaAssetsRepositoryProvider: Provider = {
  provide: MEDIA_ASSETS_REPOSITORY,
  useFactory: () => {
    const env = carregarSupabaseEnv();
    const client = criarSupabaseAdminClient(env);
    return new SupabaseMediaAssetsRepository(client, env.storageBucket);
  },
};

/**
 * Módulo de mídia (tarefa `api/modulo-media`): `POST
 * /api/admin/media/upload-url`, protegida pelo `AuthGuard` global de
 * `AuthModule` (sem precisar importá-lo aqui — o guard é global via
 * `APP_GUARD`).
 */
@Module({
  controllers: [MediaAdminController],
  providers: [mediaAssetsRepositoryProvider, EmitirCredencialUploadUseCase],
})
export class MediaModule {}
