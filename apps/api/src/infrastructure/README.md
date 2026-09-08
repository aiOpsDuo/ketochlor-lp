# Infraestrutura

Adaptadores que implementam as portas do Domínio: repositórios Supabase, armazenamento, verificador de token (ver SDD § Camadas e padrão arquitetural).

Populado pela tarefa `api/infra-supabase-adapters` (`agent_context/PLAN.md`):

- **`config/supabase-env.ts`** — lê `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`/`SUPABASE_JWKS_URL` e `SUPABASE_STORAGE_BUCKET` de `process.env` (ver `apps/api/.env.example` e `docs/API.md`). Nenhum valor real é hardcoded.
- **`supabase/supabase-client.factory.ts`** — único ponto que instancia `@supabase/supabase-js`, sempre com a chave `service_role` (ignora RLS).
- **`supabase/content-sections.repository.ts`**, **`site-metadata.repository.ts`**, **`media-assets.repository.ts`**, **`leads.repository.ts`** — implementam as portas de mesmo nome em `apps/api/src/domain/portas/*.repository.ts`. O repositório de `content_sections` escreve `data` e `item_visibility` (o `ItemVisibilityMap` do Domínio, ver `domain/visibilidade/filtrar-conteudo-publicado.ts`) na mesma instrução `UPDATE`, nunca em duas queries separadas — contrato exigido pela porta.
- **`auth/jwks-token-verificador.ts`** — implementa `VerificadorToken` (Domínio) com `jose`. Híbrido: verifica tokens `HS256` (segredo legado, o caso do Supabase CLI local) contra `SUPABASE_JWT_SECRET`, e tokens assimétricos contra o JWKS remoto (`SUPABASE_JWKS_URL`) — ver o comentário de decisão no topo do arquivo para o porquê de precisar dos dois caminhos.

Onde persistir `ItemVisibilityMap`: coluna própria `content_sections.item_visibility jsonb` (migration `supabase/migrations/20260908210000_add_item_visibility_to_content_sections.sql`), não uma chave dentro de `data` — ver o comentário de decisão em `domain/visibilidade/filtrar-conteudo-publicado.ts` (os schemas Zod de `content-schema` descartariam o campo em modo "strip").
