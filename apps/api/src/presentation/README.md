# Apresentação

Controllers, DTOs, pipes de validação, guardas de autenticação. Nenhuma regra de negócio (ver SDD § Camadas e padrão arquitetural).

O módulo `health` (`../health`) fica fora desta pasta por não pertencer a nenhum domínio de negócio — é infraestrutura de operação do próprio processo da API, não uma capacidade do CMS.

## `auth` (tarefa `api/modulo-auth`)

`AuthGuard` (`CanActivate`) protege toda rota sob `/api/admin/*`, verificando o JWT do Supabase Auth via a porta `VerificadorToken` (Domínio), ligada em `auth.module.ts` à implementação `JwksTokenVerificador` (Infraestrutura). Registrado GLOBALMENTE via `APP_GUARD` — decide sozinho, pelo caminho da requisição, se exige token (ver comentário de decisão em `auth/auth.guard.ts`). Módulos futuros (`metadata`, `media`, `leads`) importam `AuthModule` e reaproveitam o mesmo guard; nenhum precisa recriar autenticação ou decorar seus controllers manualmente, desde que suas rotas fiquem sob `/api/admin`.

## `content` (tarefa `api/modulo-content`)

Primeiro módulo real de admin — substituiu o `AdminPingController` de exemplo que provava o `AuthGuard` (removido nesta tarefa). Dois controllers, um módulo:

- `ContentPublicController` — `GET /api/content`, pública (fora de `/api/admin`, portanto fora do `AuthGuard` automaticamente). Usa `ConsultarConteudoPublicadoUseCase` (Aplicação), que combina `ContentSectionsRepository.buscarTodas()` (Infraestrutura) com `filtrarConteudoPublicado` (Domínio) para nunca vazar seção ou item não publicado. Formato de resposta: `{ sections: Record<SectionKey, SectionData | null> }` — as 11 chaves sempre presentes; seção não publicada aparece como `null`, nunca omitida (ver comentário de decisão em `application/content/consultar-conteudo-publicado.use-case.ts`).
- `ContentAdminController` (`/api/admin/sections`) — `GET /` (listagem resumida), `GET /:key` (documento completo, para edição), `PUT /:key` (substitui `data`/`itemVisibility`, valida contra o esquema da seção via `validarConteudoSecao` do Domínio antes de persistir, `422` se inválido), `PATCH /:key/visibility` (alterna `is_published`). `:key` inválida (não é uma das 11 seções fechadas) → `404` em todas as rotas com parâmetro.

Casos de uso em `apps/api/src/application/content/*.use-case.ts`; nenhuma regra de negócio nos controllers, só tradução HTTP↔caso de uso. `CONTENT_SECTIONS_REPOSITORY` (token de injeção, definido na Aplicação) é ligado a `SupabaseContentSectionsRepository` em `content.module.ts`, mesmo padrão de `VERIFICADOR_TOKEN`/`auth.module.ts`.
