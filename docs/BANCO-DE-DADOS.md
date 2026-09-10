# Banco de dados

Plataforma de dados local para desenvolvimento (ver [`agent_context/SDD.md` § "Visão de tiers (T5 — Plataforma de dados)"](../agent_context/SDD.md)): Postgres, Storage e Auth via [Supabase CLI](https://supabase.com/docs/guides/local-development), rodando em containers Docker na máquina de quem desenvolve — sem depender de nenhum projeto Supabase remoto, provisionado só na fase `integracao` do [`agent_context/PLAN.md`](../agent_context/PLAN.md) para testes internos (ver § "Homologação" abaixo — não há projeto de produção do cliente).

## Instalação da CLI

A CLI está declarada como `devDependency` da raiz do monorepo (`npm install supabase --save-dev`), não instalada globalmente — é o caminho hoje recomendado pela [documentação oficial](https://supabase.com/docs/guides/local-development/cli/getting-started) ("Install the CLI as a project dev dependency"), com a vantagem de fixar a mesma versão da CLI para todo o time via `package-lock.json`, em vez de depender de uma instalação global divergente por máquina.

```bash
npm install          # já instala a CLI junto das demais dependências
npx supabase --version
```

Todo comando da CLI abaixo roda via `npx` (ou `npm exec`), nunca como binário `supabase` solto no PATH.

Variáveis de ambiente que a API (`apps/api`) usa para se conectar a esta instância (URL, chave `service_role`, JWKS/JWT secret): ver [`docs/API.md` § Configuração](./API.md).

## Como rodar

Pré-requisito: Docker (Desktop ou daemon equivalente) disponível e em execução — a CLI sobe Postgres, Storage, Auth e demais serviços como containers.

```bash
npx supabase start   # sobe Postgres, Storage, Auth (e Studio) locais
npx supabase status  # reimprime URLs e chaves da instância já rodando
npx supabase stop    # encerra e remove os containers
```

Na primeira execução, `supabase start` baixa as imagens Docker dos serviços — pode levar alguns minutos; execuções seguintes reaproveitam as imagens já baixadas e sobem em segundos. Ao final da sessão de trabalho, sempre rode `npx supabase stop` para não deixar os containers ativos.

Serviços expostos localmente (portas padrão, configuráveis em `supabase/config.toml`):

| Serviço | URL local |
|---|---|
| API (REST/Auth/Storage), via Kong | `http://127.0.0.1:54321` |
| Postgres | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio (painel de administração do Supabase) | `http://127.0.0.1:54323` |

## Estrutura

- `supabase/config.toml` — configuração do projeto local (versão do Postgres, portas, schemas expostos, etc.). Versionado.
- `supabase/migrations/` — migrations SQL do schema, aplicadas em ordem por `supabase db reset`/`supabase db push`.
- `supabase/.gitignore` — gerado pela própria CLI, ignora `.branches` e `.temp` (estado local efêmero da CLI); não duplicado no `.gitignore` da raiz.

## Modelo de dados

Quatro tabelas, todas em `public`. Detalhe completo de cada coluna em [`agent_context/SDD.md` § "Modelo de dados"](../agent_context/SDD.md) — aqui só o propósito de uma linha cada:

| Tabela | Propósito |
|---|---|
| `content_sections` | Uma linha por seção da LP (as 11 seções fechadas do PRD), com o conteúdo em `data jsonb`, a visibilidade de item de lista em `item_visibility jsonb` (ver nota abaixo) e uma flag `is_published` de visibilidade da seção inteira. |
| `site_metadata` | Registro único (singleton) com título, descrição e a URL pública (`og_image_url`) da imagem de Open Graph do site. |
| `media_assets` | Um registro por imagem enviada ao Storage pelo fluxo de confirmação de `POST /api/admin/media/upload-url` (`docs/API.md` § Mídia) — hoje nenhum documento de `content_sections`/`site_metadata` referencia essas linhas por id; ambos guardam a URL pública diretamente (ver nota abaixo). |
| `leads` | Um registro por envio do formulário de Material Técnico da LP pública. |

### Row Level Security

RLS está **habilitado nas quatro tabelas, sem nenhuma policy** para os papéis `anon`/`authenticated` — nenhuma linha é visível ou editável por essas roles, em nenhuma tabela. Todo acesso ao banco passa pela API (`apps/api`), que usa a chave secreta do lado do servidor (`service_role`, que ignora RLS); nenhum cliente (LP, painel) alcança o Postgres diretamente. Ver [`agent_context/SDD.md` § "Modelo de dados" → "Row Level Security"](../agent_context/SDD.md).

### `content_sections.item_visibility`

Coluna adicionada pela migration `20260908210000_add_item_visibility_to_content_sections.sql` (tarefa `api/infra-supabase-adapters`), separada de `data` de propósito: guarda o `ItemVisibilityMap` do Domínio (`apps/api/src/domain/visibilidade/filtrar-conteudo-publicado.ts`), um mapa `{ campoDaLista: boolean[] }` alinhado por índice às listas dentro de `data`. Não fica dentro do próprio `data` porque os esquemas Zod de `@ketochlor/content-schema` usam modo "strip" — um campo de visibilidade ali seria descartado silenciosamente pela validação. O repositório de Infraestrutura sempre escreve `data` e `item_visibility` na mesma instrução `UPDATE`, nunca em duas queries separadas, para as duas nunca ficarem dessincronizadas (ver `agent_context/PLAN.md`, nota de design após `api/dominio-esquemas-e-regras`).

### `site_metadata.og_image_url` (renomeada de `og_image_media_id`)

A migration `20260910120000_rename_site_metadata_og_image_to_url.sql` (tarefa `ajustes/corrige-imagem-metadados`, achado de QA) renomeia a coluna `og_image_media_id` (`uuid`) para `og_image_url` e a retipa para `text`. Motivo: a coluna nasceu como referência a `media_assets.id`, mas nenhuma rota da API jamais criava esse registro (`MediaAssetsRepository.criar` existe mas nenhum caso de uso o chama, ver linha de `media_assets` na tabela acima) — o campo era sempre `null` na prática. Agora guarda a URL pública diretamente, validada em `PUT /api/admin/metadata` (`docs/API.md` § Metadados), o mesmo padrão já usado pelas imagens de seção (`{ url, alt }` em `content_sections.data`).

### Bucket de Storage

Bucket `images`, público apenas para **leitura** (`storage.buckets.public = true` + policy de `select` para todos os papéis) — a landing page lê imagens já publicadas sem autenticação. Escrita (`insert`/`update`/`delete`) não tem policy para `anon`/`authenticated`: só `service_role` grava direto; o upload feito pelo navegador do painel usa uma credencial temporária emitida pela API (SDD § Decisões técnicas e trade-offs), nunca uma policy permanente aberta.

## Seed do conteúdo inicial de `content_sections`

A migration `20260908192455_create_content_sections.sql` cria as 11 linhas de `content_sections` com `data = '{}'::jsonb` — só o esqueleto da tabela. O conteúdo real do Ketochlor (o mesmo hoje presente em `packages/content-schema/src/sections/*.ts`, export `CONTENT_SECTIONS` — migrado literalmente de `apps/lp/src/data/content.ts`, ver PRD § Premissas) vem de `supabase/seed.sql`, um arquivo **gerado**, nunca editado à mão.

### Local — automático

`supabase/seed.sql` é gerado por `apps/api/scripts/gerar-seed-conteudo-inicial.mjs`, que lê `CONTENT_SECTIONS` de `@ketochlor/content-schema` e escreve um `INSERT ... ON CONFLICT (key) DO UPDATE` (upsert idempotente — atualiza `data` se a linha já existe, sem duplicar nem falhar) para as 11 seções. O arquivo gerado fica versionado no repositório (não é gitignored), então qualquer pessoa que clona o projeto já recebe o seed pronto.

```bash
npm run build --workspace=@ketochlor/content-schema   # garante o dist/ atualizado
npm run gerar-seed --workspace=@ketochlor/api          # regrava supabase/seed.sql
```

Rode isso sempre que o conteúdo inicial de uma seção mudar em `packages/content-schema/src/sections/*.ts`, e commite o `supabase/seed.sql` resultante junto da mudança.

O Supabase CLI roda `supabase/seed.sql` automaticamente ao final de **todo** `npx supabase db reset` — comportamento observado, não presumido (rodar `npx supabase db reset` localmente imprime `Seeding data from supabase/seed.sql...` como um dos últimos passos, depois de aplicar as migrations). Isso significa que qualquer ambiente local — de qualquer pessoa do time, ou um CI futuro que suba o Supabase local para testes — já nasce com o conteúdo real do Ketochlor em `content_sections`, nunca com o placeholder vazio da migration.

### Homologação — manual, feita uma vez pelo orquestrador ao provisionar o projeto de teste interno

**Não existe projeto de produção do cliente.** O que existe é um projeto Supabase de **homologação** (provisionado e semeado em 2026-09-10, ver `agent_context/CHANGELOG.md` § "Projeto Supabase de homologação do Ketochlor provisionado e semeado") — um ambiente de teste interno da equipe, usado para validar o CMS de ponta a ponta antes de qualquer entrega ao cliente. As migrations e o `supabase/seed.sql` gerado acima foram aplicados uma única vez, manualmente, por uma das duas rotas abaixo. Isso não é algo que `gerar-seed-conteudo-inicial.mjs` dispara sozinho contra um projeto remoto — o conteúdo desse ambiente, depois do seed inicial, é editado pelo time direto no painel (`/admin`), nunca reaplicando este arquivo.

1. **Via `psql`, apontando para o Postgres do projeto de homologação**:
   ```bash
   psql "postgresql://postgres:<senha>@db.<project-ref>.supabase.co:5432/postgres" -f supabase/seed.sql
   ```
   (string de conexão disponível em Project Settings → Database, no painel do Supabase do projeto). **Nota de conectividade observada nesta máquina:** `db.<project-ref>.supabase.co` só resolve endereço IPv6 — sem rota IPv6 de saída, a conexão direta falha, e o caminho que funcionou foi o **Session Pooler** (Supavisor, IPv4), `postgresql://postgres.<project-ref>@aws-0-<região>.pooler.supabase.com:5432/postgres` — a connection string exata (já com a região certa) está na aba "Connect" do dashboard do projeto, em vez de descobrir a região por tentativa.
2. **Via SQL Editor do Supabase Studio** do projeto de homologação: abrir `supabase/seed.sql`, colar o conteúdo no editor SQL e executar — sem o problema de conectividade do item acima, por rodar no navegador.

Qualquer uma das duas é segura para rodar mais de uma vez (o `ON CONFLICT DO UPDATE` já é idempotente) — mas continua sendo uma ação manual, de uso raro (reprovisionar um ambiente do zero), não o caminho normal de corrigir ou atualizar conteúdo já publicado nele. Quando o projeto de produção real do cliente existir, o mesmo processo se aplica a ele, separadamente.
