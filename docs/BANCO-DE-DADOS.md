# Banco de dados

Plataforma de dados auto-hospedada (ver [`agent_context/SDD.md` § "Visão de tiers (T5 — Plataforma de dados)"](../agent_context/SDD.md)): **MySQL 8** (conteúdo, metadados, mídia, leads, operadores) e **MinIO** (armazenamento de imagens, compatível com S3), ambos como serviços do mesmo `docker-compose.yml` do projeto — sem depender de nenhum provedor externo.

> **Migração de plataforma (2026-09-21/22):** até a fase `ajustes/migracao-mysql-*` (ver [`agent_context/PLAN.md`](../agent_context/PLAN.md)), esta peça era o Supabase (Postgres + Storage + Auth), local via CLI. A migração trocou os dois serviços de dados por MySQL + MinIO auto-hospedados e moveu a emissão de identidade para um módulo próprio da API (`POST /api/auth/login`, ver [`docs/API.md` § Autenticação](./API.md)) — decisão e motivação completas em [`agent_context/SDD.md` § "Migração de plataforma de dados"](../agent_context/SDD.md) e em `agent_context/CHANGELOG.md` (entradas de 2026-09-21/22). Nada neste documento descreve mais o Supabase como algo em uso.

## Como rodar

Pré-requisito: Docker (Desktop ou daemon equivalente) disponível e em execução. Suba só a plataforma de dados (sem `api`/`proxy`) para trabalhar contra ela diretamente:

```bash
docker compose up -d mysql minio minio-init
```

`mysql` e `minio` não publicam porta nenhuma para o host, exceto a API S3 do `minio` (`9000`) — ver "Por que a porta do MinIO é publicada" abaixo. `minio-init` roda uma vez (cria o bucket + a policy de leitura pública, ver "Bucket MinIO" abaixo) e sai com `exit 0` — não é um processo de vida longa, `docker compose ps` o mostra como `Exited (0)` depois de concluído, o que é o comportamento esperado, não uma falha.

```bash
docker compose ps                 # mysql/minio "healthy", minio-init "Exited (0)"
docker compose down                # derruba os containers, preserva os volumes nomeados
docker compose down -v             # derruba containers E apaga os volumes (mysql-data, minio-data) — reinício do zero
```

## Migrations (schema)

Sem CLI de terceiro: um runner próprio, sem ORM (`mysql2` puro, mesmo estilo direto que os antigos adaptadores Supabase já usavam) aplica as migrations SQL versionadas em `apps/api/mysql/migrations/*.sql`.

```bash
npm run migrate:mysql --prefix apps/api
```

`migrate:mysql` (`apps/api/scripts/migrar-mysql.mjs`) lê `apps/api/mysql/migrations/*.sql` em ordem alfabética do nome do arquivo (prefixo numérico `NNNN_`), cria a tabela de controle `schema_migrations` se ainda não existir, e aplica só os arquivos ainda não registrados nela — rodar de novo é seguro, não tenta recriar o que já existe (`Nenhuma migration pendente — schema_migrations já cobre todos os arquivos.`). Roda como `root` do MySQL (nunca com a credencial de aplicação, que não tem privilégio de DDL — ver "Usuário de aplicação" abaixo); precisa de `MYSQL_DATABASE`/`MYSQL_ROOT_PASSWORD` no ambiente (os mesmos valores do `.env` da raiz, ver [`docs/DOCKER.md` § Variáveis de ambiente](./DOCKER.md)) e, por padrão, resolve o host `mysql` — o nome do serviço no compose, então este script foi desenhado para rodar de dentro da rede do compose (`docker compose run`) ou de um processo que já tenha `MYSQL_HOST` apontando para onde o MySQL está de fato alcançável (ex. `127.0.0.1`, com a porta publicada manualmente num `docker-compose.override.yml` local).

Arquivos de migration hoje (`apps/api/mysql/migrations/`), uma tabela por arquivo, na ordem em que criam as tabelas:

| Arquivo | Tabela |
|---|---|
| `0001_create_content_sections.sql` | `content_sections` (já semeia as 11 linhas com `data`/`item_visibility` vazios) |
| `0002_create_site_metadata.sql` | `site_metadata` (já semeia o registro único `id = 1`) |
| `0003_create_media_assets.sql` | `media_assets` |
| `0004_create_leads.sql` | `leads` |
| `0005_create_operators.sql` | `operators` |

## Modelo de dados

Cinco tabelas em MySQL 8. Detalhe completo de cada coluna em [`agent_context/SDD.md` § "Modelo de dados"](../agent_context/SDD.md) (inclui a tabela de equivalência de tipos Postgres → MySQL usada na migração) — aqui só o propósito de uma linha cada:

| Tabela | Propósito |
|---|---|
| `content_sections` | Uma linha por seção da LP (as 11 seções fechadas do PRD), com o conteúdo em `data JSON`, a visibilidade de item de lista em `item_visibility JSON` (ver nota abaixo) e uma flag `is_published` de visibilidade da seção inteira. |
| `site_metadata` | Registro único (`id TINYINT(1) PRIMARY KEY DEFAULT 1 CHECK (id = 1)`) com título, descrição e a URL pública (`og_image_url`) da imagem de Open Graph do site. |
| `media_assets` | Um registro por imagem enviada ao MinIO e confirmada por `MinioMediaAssetsRepository.criar` — ver [`docs/API.md` § Mídia](./API.md) para o fluxo completo e a lacuna conhecida (o painel ainda não chama essa confirmação). |
| `leads` | Um registro por envio do formulário de Material Técnico da LP pública. |
| `operators` | Um registro por operador com acesso ao painel — tabela nova desde a migração (antes o operador era integralmente um usuário do Supabase Auth, sem tabela própria). |

### `content_sections.item_visibility`

Coluna paralela a `data`, guarda o `ItemVisibilityMap` do Domínio (`apps/api/src/domain/visibilidade/filtrar-conteudo-publicado.ts`), um mapa `{ campoDaLista: boolean[] }` alinhado por índice às listas dentro de `data`. Não fica dentro do próprio `data` porque os esquemas Zod de `@ketochlor/content-schema` descartariam um campo de visibilidade ali. O repositório de Infraestrutura (`MySqlContentSectionsRepository`) sempre escreve `data` e `item_visibility` na mesma instrução `UPDATE`, nunca em duas queries separadas, para as duas nunca ficarem dessincronizadas (ver `agent_context/PLAN.md`, nota de design após `api/dominio-esquemas-e-regras`).

### `site_metadata.og_image_url`

Guarda a URL pública da imagem de Open Graph diretamente (`VARCHAR(2048)`, nulável), validada em `PUT /api/admin/metadata` (`docs/API.md` § Metadados) — o mesmo padrão já usado pelas imagens de seção (`{ url, alt }` em `content_sections.data`). Sem indireção por `media_assets.id`: nenhuma rota da API grava esse campo como referência a um registro de mídia.

### Usuário de aplicação (sem Row Level Security)

MySQL não tem um equivalente a Row Level Security. O mesmo efeito de "nenhum cliente além do servidor acessa os dados" nasce de duas garantias, verificadas de verdade (não só declaradas):

1. **Isolamento de rede:** nem `mysql` nem `minio` (exceto a porta 9000 da API S3, ver abaixo) publicam `ports` para o host no `docker-compose.yml` — só alcançáveis pela rede interna do compose, pelo nome de serviço.
2. **Usuário de aplicação sem DDL:** `docker/mysql/initdb/01-create-app-user.sh` roda uma única vez, na primeira inicialização do volume `mysql-data` (a imagem oficial só executa scripts de `/docker-entrypoint-initdb.d/` quando o diretório de dados está vazio — para recriar o usuário do zero, é preciso `docker compose down -v`, que apaga o volume). Cria `MYSQL_APP_USER` com `GRANT SELECT, INSERT, UPDATE, DELETE, INDEX` em `MYSQL_DATABASE` — sem `CREATE`/`ALTER`/`DROP`. `apps/api` sempre se conecta com esse usuário em runtime (`apps/api/src/infrastructure/mysql/mysql-client.factory.ts`); só o runner de migrations roda como `root`.

Verificado de verdade (não presumido) nas tarefas técnicas da migração: um `CREATE TABLE` com a credencial de aplicação falha com `ERROR 1142 (42000): CREATE command denied` — ver "Comandos já verificados de ponta a ponta nas tarefas anteriores da migração" ao final deste documento.

## Bucket MinIO (`images`)

O serviço `minio-init` (`docker-compose.yml`) roda uma vez, cria o bucket `images` (`mc mb --ignore-existing`) e aplica uma policy JSON própria de leitura pública **só de objeto** (`docker/minio/init-bucket.sh`, via `mc anonymous set-json`): concede apenas `s3:GetObject` sobre `arn:aws:s3:::images/*` — um `GET` anônimo de uma URL de objeto específica funciona, mas `s3:ListBucket` (listagem do bucket inteiro) continua negada. **Não** usamos a policy canônica `mc anonymous set download`: confirmado empiricamente (`mc anonymous get-json`) que ela concede também `s3:ListBucket`/`s3:GetBucketLocation` no bucket inteiro, o que exporia a lista completa de arquivos — mais do que o necessário. Sem essa policy, o MinIO nega leitura anônima por padrão, e a `public_url` gravada em `media_assets` teria a *forma* de uma URL pública sem ser de fato acessível.

### Por que a porta do MinIO é publicada (`9000`, nunca o console `9001`)

Diferente de `mysql`/`api` (só rede interna do compose), o serviço `minio` publica a porta da API S3 (`9000`) para o host. Motivo: o padrão de upload de imagem deste projeto é o navegador enviar os bytes **direto** ao Storage, com uma URL pré-assinada emitida pela API (`POST /api/admin/media/upload-url`, ver [`docs/API.md` § Mídia](./API.md)) — o mesmo padrão que o Supabase Storage original já seguia, que também era um endpoint HTTPS público, nunca interno. Sem a porta publicada, qualquer navegador real (dev, homologação ou produção) recebe uma URL de upload apontando para o hostname interno do compose (`minio`), irresolvível fora da rede do Docker — bug real encontrado e corrigido durante a migração (`agent_context/PLAN.md`, tarefa `ajustes/migracao-mysql-minio-endpoint-publico`; `agent_context/CHANGELOG.md`, 2026-09-22).

**`MINIO_ENDPOINT`** (variável do serviço `api`) precisa ser exatamente o endpoint que o navegador de fato alcança — nunca o hostname interno `minio:9000`. Motivo técnico: a assinatura SigV4 da URL pré-assinada inclui o header `Host` (`X-Amz-SignedHeaders=host`), então reescrever a URL depois de assinada invalidaria a assinatura; o `S3Client` do servidor precisa já ser configurado com o endpoint público antes de assinar. Default de desenvolvimento (`docker-compose.yml`): `http://localhost:9000` — funciona porque a mesma máquina que roda o compose também abre o navegador; a assinatura em si não abre conexão de rede real a este valor, só o usa para compor a URL, então funciona mesmo lido de dentro do container da `api`. Em homologação/produção, quem publicar **precisa** sobrescrever `MINIO_ENDPOINT` no `.env` com o domínio/IP público real na porta exposta do MinIO. `docker/minio/init-bucket.sh` continua usando o hostname interno (`minio:9000`) de propósito — roda dentro da rede do compose, nunca precisa do endpoint público.

Isso não reabre o bucket para escrita anônima nem para listagem: o controle de acesso real continua sendo a policy de leitura pública só de objeto (acima) e a exigência de uma credencial pré-assinada para qualquer `PUT`.

## Seed do conteúdo inicial

As migrations só criam o esqueleto das tabelas — `content_sections` nasce com `data = '{}'`/`item_visibility = '{}'` para as 11 seções, `site_metadata` nasce com `title`/`description` vazios. O conteúdo real do Ketochlor (o mesmo hoje presente em `packages/content-schema/src/sections/*.ts`, export `CONTENT_SECTIONS`) vem de `apps/api/mysql/seed.sql`, um arquivo **gerado**, versionado no repositório, nunca editado à mão.

```bash
npm run build --workspace=@ketochlor/content-schema   # garante o dist/ atualizado
npm run gerar-seed:mysql --prefix apps/api            # regrava apps/api/mysql/seed.sql
```

`gerar-seed-mysql.mjs` lê `CONTENT_SECTIONS` e escreve, por seção, um `UPDATE content_sections SET data = ... WHERE \`key\` = ...` (as 11 linhas já existem via migration, só `data` é tocada — upsert idempotente, seguro de rodar mais de uma vez), mais um `UPDATE site_metadata SET title = ..., description = ... WHERE id = 1` com o título/descrição reais de SEO do Ketochlor (recuperados de `apps/lp/index.html`, inalterados desde o primeiro commit do projeto — nem a migration Postgres original nem a MySQL jamais gravaram esse conteúdo, achado registrado em `agent_context/CHANGELOG.md`, 2026-09-22).

Rode isso sempre que o conteúdo inicial de uma seção mudar em `packages/content-schema/src/sections/*.ts`, e commite o `apps/api/mysql/seed.sql` resultante junto da mudança.

Para aplicar o seed já gerado a um MySQL rodando:

```bash
docker compose exec -T mysql mysql \
  --default-character-set=utf8mb4 \
  -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" \
  < apps/api/mysql/seed.sql
```

**`--default-character-set=utf8mb4` é obrigatório, não cosmético.** Achado real durante a migração (`agent_context/CHANGELOG.md`, 2026-09-22): sem essa flag, o cliente `mysql` desta imagem assume `latin1` para a conexão mesmo com o schema em `utf8mb4` — cada byte UTF-8 do arquivo é reinterpretado como Latin-1 e regravado, corrompendo silenciosamente qualquer acento e o símbolo "®" (mojibake persistido na coluna, confirmado via `SELECT HEX(...)` antes/depois). Sem a flag, `GET /api/content` continua devolvendo JSON válido, mas com texto ilegível — um bug fácil de não notar numa verificação superficial.

### Primeiro operador do painel

Nenhuma migration nem o seed acima cria um operador — a tabela `operators` nasce vazia de propósito (credencial é sempre um dado sensível, nunca deveria nascer de um arquivo versionado). Duas formas de criar o primeiro operador:

- **Via `INSERT` direto**, com o hash de senha gerado por um script Node descartável que chama `hash(senha, 12)` de `bcryptjs` (mesmo custo usado por `MySqlOperadoresRepository`) — o caminho usado para o operador de desenvolvimento/homologação desta migração (`agent_context/PLAN.md`, tarefa `ajustes/migracao-mysql-dados-homologacao`), com e-mail/senha lidos de variável de ambiente, nunca hardcoded nem commitados.
- **Via API**, depois de já existir pelo menos um operador: `POST /api/admin/operators` (autenticado, ver [`docs/API.md` § Operadores](./API.md)).

`leads` nasce e permanece vazia até o primeiro envio real do formulário da LP — não há seed de lead (lead é dado do visitante, não conteúdo do CMS).

## Comandos já verificados de ponta a ponta nas tarefas anteriores da migração

Todos os comandos acima já foram executados de verdade — contra o `mysql`/`minio` reais do `docker-compose.yml`, não simulados — nas tarefas técnicas que antecederam esta (`agent_context/PLAN.md`, fase `ajustes`, prefixo `migracao-mysql-*`): `migracao-mysql-schema` (5 migrations aplicadas do zero + idempotência na 2ª execução + `SHOW GRANTS`/`CREATE TABLE` recusado com o usuário de aplicação), `migracao-mysql-dados-homologacao` (seed real gerado e aplicado, incluindo o achado do `--default-character-set=utf8mb4`) e `migracao-mysql-verificacao-ponta-a-ponta` (pilha completa reconstruída do zero e todos os critérios de aceitação do SDD reverificados via `curl` real). Os relatos completos de cada execução estão registrados em `agent_context/PLAN.md` (entradas dessas tarefas) e `agent_context/CHANGELOG.md`.
