# Aplicação

Casos de uso: publicar seção, registrar mídia, receber lead, exportar leads, atualizar metadados. Orquestra Domínio e Portas (ver SDD § Camadas e padrão arquitetural).

## `content/` (tarefa `api/modulo-content`)

Casos de uso consumidos por `presentation/content/*.controller.ts`, cada um `@Injectable()` do Nest, injetando a porta `ContentSectionsRepository` (Domínio) pelo token `CONTENT_SECTIONS_REPOSITORY` (definido em `content-sections-repository.token.ts`, ligado à implementação Supabase em `presentation/content/content.module.ts`):

- `ConsultarConteudoPublicadoUseCase` — `GET /api/content`: `buscarTodas()` + `filtrarConteudoPublicado` (Domínio).
- `ListarSecoesUseCase` — `GET /api/admin/sections`: resumo (`key`, `isPublished`, `updatedAt`) das 11 seções, na ordem de `CONTENT_SECTIONS`.
- `ConsultarSecaoUseCase` — `GET /api/admin/sections/:key`: documento completo, sem filtrar visibilidade.
- `AtualizarSecaoUseCase` — `PUT /api/admin/sections/:key`: valida `data` via `validarConteudoSecao` (Domínio) ANTES de persistir; nunca grava um `data` inválido.
- `AlternarVisibilidadeSecaoUseCase` — `PATCH /api/admin/sections/:key/visibility`.

`ConsultarConteudoPublicadoUseCase` também injeta `SITE_METADATA_REPOSITORY` (token de `metadata/site-metadata-repository.token.ts`) desde a tarefa `api/modulo-metadata`, para compor `metadata` na resposta de `GET /api/content` — ver comentário de decisão no próprio caso de uso sobre por que ele foi estendido em vez de substituído por um caso de uso que compõe dois outros.

## `metadata/` (tarefa `api/modulo-metadata`)

Casos de uso consumidos por `presentation/metadata/metadata-admin.controller.ts`, injetando a porta `SiteMetadataRepository` (Domínio) pelo token `SITE_METADATA_REPOSITORY` (ligado à implementação Supabase em `presentation/metadata/metadata.module.ts`, exportado dali para uso também por `application/content`):

- `ConsultarMetadataUseCase` — `GET /api/admin/metadata`: devolve o registro único tal como persistido.
- `AtualizarMetadataUseCase` — `PUT /api/admin/metadata`: valida o corpo via `validarSiteMetadata` (Domínio) ANTES de persistir.

## `media/` (tarefa `api/modulo-media`)

Caso de uso consumido por `presentation/media/media-admin.controller.ts`, injetando a porta `MediaAssetsRepository` (Domínio) pelo token `MEDIA_ASSETS_REPOSITORY` (ligado à implementação Supabase em `presentation/media/media.module.ts`):

- `EmitirCredencialUploadUseCase` — `POST /api/admin/media/upload-url`: valida o corpo via `validarSolicitacaoUpload` (Domínio) ANTES de reservar o id/emitir a credencial; chama só `MediaAssetsRepository.emitirCredencialUpload` (nunca `criar` — esse método existe na porta desde `api/infra-supabase-adapters` para a confirmação pós-upload, mas não é exposto por nenhuma rota nesta tarefa, ver nota de decisão no controller).

Demais subpasta (`leads`) vazia nesta tarefa — populada pela tarefa futura da fase `api` do plano.
