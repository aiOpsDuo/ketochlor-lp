# Apresentação

Controllers, DTOs, pipes de validação, guardas de autenticação. Nenhuma regra de negócio (ver SDD § Camadas e padrão arquitetural).

O módulo `health` (`../health`) fica fora desta pasta por não pertencer a nenhum domínio de negócio — é infraestrutura de operação do próprio processo da API, não uma capacidade do CMS.

## `auth` (tarefa `api/modulo-auth`)

`AuthGuard` (`CanActivate`) protege toda rota sob `/api/admin/*`, verificando o JWT do Supabase Auth via a porta `VerificadorToken` (Domínio), ligada em `auth.module.ts` à implementação `JwksTokenVerificador` (Infraestrutura). Registrado GLOBALMENTE via `APP_GUARD` — decide sozinho, pelo caminho da requisição, se exige token (ver comentário de decisão em `auth/auth.guard.ts`). Módulos futuros (`content`, `metadata`, `media`, `leads`) importam `AuthModule` e reaproveitam o mesmo guard; nenhum precisa recriar autenticação ou decorar seus controllers manualmente, desde que suas rotas fiquem sob `/api/admin`.

## `admin` (controller de exemplo, descartável)

`AdminPingController` (`GET /api/admin/ping`) existe só para provar o `AuthGuard` de ponta a ponta — não é um módulo de produto. Remova-o (e `AdminPingModule`) quando o primeiro módulo real de admin (`api/modulo-content`) existir.
