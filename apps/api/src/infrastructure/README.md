# Infraestrutura

Adaptadores que implementam as portas do Domínio: repositórios MySQL, armazenamento MinIO, autenticação própria (ver SDD § Camadas e padrão arquitetural).

Plataforma de dados: MySQL + MinIO + auth própria (SDD § "Migração de plataforma de dados"; `agent_context/PLAN.md`, tarefa `ajustes/migracao-mysql-cutover-wiring`).

- **`config/mysql-env.ts`** — lê `MYSQL_HOST`/`MYSQL_PORT`/`MYSQL_DATABASE`/`MYSQL_APP_USER`/`MYSQL_APP_PASSWORD` de `process.env` (ver `apps/api/.env.example`). Nenhum valor real é hardcoded.
- **`config/minio-env.ts`** — lê `MINIO_ENDPOINT` (ou `MINIO_HOST`/`MINIO_PORT`), `MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`, `MINIO_BUCKET`, `MINIO_REGION`.
- **`config/auth-jwt-env.ts`** — lê `AUTH_JWT_SECRET`/`AUTH_JWT_EXPIRES_IN`, o segredo HS256 próprio da aplicação (nunca um segredo de terceiro).
- **`mysql/mysql-client.factory.ts`** — único ponto que instancia o pool `mysql2`, sempre com o usuário de aplicação (sem privilégio de DDL em runtime).
- **`mysql/content-sections.repository.ts`**, **`site-metadata.repository.ts`**, **`leads.repository.ts`**, **`operadores.repository.ts`** — implementam as portas de mesmo nome em `apps/api/src/domain/portas/*.repository.ts` (mais `OperadorCredenciaisRepository`, no caso de `MySqlOperadoresRepository`). O repositório de `content_sections` escreve `data` e `item_visibility` (o `ItemVisibilityMap` do Domínio, ver `domain/visibilidade/filtrar-conteudo-publicado.ts`) na mesma instrução `UPDATE`, nunca em duas queries separadas — contrato exigido pela porta.
- **`minio/minio-client.factory.ts`** — único ponto que instancia o `S3Client` apontado para o MinIO (`forcePathStyle: true`, obrigatório para MinIO).
- **`minio/media-assets.repository.ts`** — implementa `MediaAssetsRepository` sobre o protocolo S3 (upload/URL pré-assinada) + MySQL (linha em `media_assets`, gravada só após o upload confirmado).
- **`auth/app-jwt.ts`**/**`auth/app-jwt-token-verificador.ts`** — emitem/verificam o JWT próprio da aplicação (`jose`, HS256, `AUTH_JWT_SECRET`).

Onde persistir `ItemVisibilityMap`: coluna própria `content_sections.item_visibility JSON` (`apps/api/mysql/migrations/`), não uma chave dentro de `data` — ver o comentário de decisão em `domain/visibilidade/filtrar-conteudo-publicado.ts` (os schemas Zod de `content-schema` descartariam o campo em modo "strip").
