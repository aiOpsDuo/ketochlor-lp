import { Module, type Provider } from '@nestjs/common';
import { EmitirCredencialUploadUseCase } from '../../application/media/emitir-credencial-upload.use-case';
import { MEDIA_ASSETS_REPOSITORY } from '../../application/media/media-assets-repository.token';
import {
  carregarMinioEnv,
  carregarMysqlEnv,
  criarMinioClient,
  criarMysqlPool,
  MinioMediaAssetsRepository,
} from '../../infrastructure';
import { MediaAdminController } from './media-admin.controller';

/**
 * Liga a porta `MediaAssetsRepository` (Domínio) à implementação concreta
 * `MinioMediaAssetsRepository` (Infraestrutura, protocolo S3 sobre MinIO +
 * MySQL para a tabela `media_assets`) — mesmo padrão de
 * `presentation/metadata/metadata.module.ts` para `SITE_METADATA_REPOSITORY`
 * (SDD § "Migração de plataforma de dados"). Precisa dos DOIS clientes: o S3
 * (upload/URL pré-assinada) e o pool MySQL (grava o registro em
 * `media_assets` depois do upload confirmado — ver
 * `MinioMediaAssetsRepository.criar`).
 */
const mediaAssetsRepositoryProvider: Provider = {
  provide: MEDIA_ASSETS_REPOSITORY,
  useFactory: () => {
    const minioEnv = carregarMinioEnv();
    const client = criarMinioClient(minioEnv);
    const pool = criarMysqlPool(carregarMysqlEnv());
    return new MinioMediaAssetsRepository(client, pool, minioEnv.bucket, minioEnv.endpoint);
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
