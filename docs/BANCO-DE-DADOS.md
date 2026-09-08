# Banco de dados

Plataforma de dados local para desenvolvimento (ver [`agent_context/SDD.md` § "Visão de tiers (T5 — Plataforma de dados)"](../agent_context/SDD.md)): Postgres, Storage e Auth via [Supabase CLI](https://supabase.com/docs/guides/local-development), rodando em containers Docker na máquina de quem desenvolve — sem depender do projeto Supabase de produção, que só é provisionado na fase `integracao` do [`agent_context/PLAN.md`](../agent_context/PLAN.md).

## Instalação da CLI

A CLI está declarada como `devDependency` da raiz do monorepo (`npm install supabase --save-dev`), não instalada globalmente — é o caminho hoje recomendado pela [documentação oficial](https://supabase.com/docs/guides/local-development/cli/getting-started) ("Install the CLI as a project dev dependency"), com a vantagem de fixar a mesma versão da CLI para todo o time via `package-lock.json`, em vez de depender de uma instalação global divergente por máquina.

```bash
npm install          # já instala a CLI junto das demais dependências
npx supabase --version
```

Todo comando da CLI abaixo roda via `npx` (ou `npm exec`), nunca como binário `supabase` solto no PATH.

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
- `supabase/migrations/` — migrations SQL do schema, aplicadas em ordem por `supabase db reset`/`supabase db push`. Ainda **não existe**: as tabelas do CMS (`content_sections`, `site_metadata`, `media_assets`, `leads`) chegam nas próximas tarefas da fase `dados` do [`PLAN.md`](../agent_context/PLAN.md), uma por vez.
- `supabase/.gitignore` — gerado pela própria CLI, ignora `.branches` e `.temp` (estado local efêmero da CLI); não duplicado no `.gitignore` da raiz.

## Próximos passos (fase `dados` do plano)

Row Level Security, o bucket de Storage para imagens e o modelo de dados completo (quatro tabelas) estão descritos em [`agent_context/SDD.md` § "Modelo de dados"](../agent_context/SDD.md) e serão implementados pelas tarefas seguintes desta fase (`migration-content-sections`, `migration-site-metadata`, `migration-media-assets`, `migration-leads`, `rls-e-storage`) — este documento será completado então, sem antecipar aqui uma tabela que ainda não existe.
