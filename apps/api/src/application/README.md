# Aplicação

Casos de uso: publicar seção, registrar mídia, receber lead, exportar leads, atualizar metadados. Orquestra Domínio e Portas (ver SDD § Camadas e padrão arquitetural).

## `content/` (tarefa `api/modulo-content`)

Casos de uso consumidos por `presentation/content/*.controller.ts`, cada um `@Injectable()` do Nest, injetando a porta `ContentSectionsRepository` (Domínio) pelo token `CONTENT_SECTIONS_REPOSITORY` (definido em `content-sections-repository.token.ts`, ligado à implementação Supabase em `presentation/content/content.module.ts`):

- `ConsultarConteudoPublicadoUseCase` — `GET /api/content`: `buscarTodas()` + `filtrarConteudoPublicado` (Domínio).
- `ListarSecoesUseCase` — `GET /api/admin/sections`: resumo (`key`, `isPublished`, `updatedAt`) das 11 seções, na ordem de `CONTENT_SECTIONS`.
- `ConsultarSecaoUseCase` — `GET /api/admin/sections/:key`: documento completo, sem filtrar visibilidade.
- `AtualizarSecaoUseCase` — `PUT /api/admin/sections/:key`: valida `data` via `validarConteudoSecao` (Domínio) ANTES de persistir; nunca grava um `data` inválido.
- `AlternarVisibilidadeSecaoUseCase` — `PATCH /api/admin/sections/:key/visibility`.

Demais subpastas (`media`, `leads`, `metadata`) vazias nesta tarefa — populadas pelas tarefas futuras da fase `api` do plano.
