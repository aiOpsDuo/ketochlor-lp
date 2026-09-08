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
- `supabase/migrations/` — migrations SQL do schema, aplicadas em ordem por `supabase db reset`/`supabase db push`.
- `supabase/.gitignore` — gerado pela própria CLI, ignora `.branches` e `.temp` (estado local efêmero da CLI); não duplicado no `.gitignore` da raiz.

## Modelo de dados

Quatro tabelas, todas em `public`. Detalhe completo de cada coluna em [`agent_context/SDD.md` § "Modelo de dados"](../agent_context/SDD.md) — aqui só o propósito de uma linha cada:

| Tabela | Propósito |
|---|---|
| `content_sections` | Uma linha por seção da LP (as 11 seções fechadas do PRD), com o conteúdo em `data jsonb` e uma flag `is_published` de visibilidade. |
| `site_metadata` | Registro único (singleton) com título, descrição e imagem de Open Graph do site. |
| `media_assets` | Um registro por imagem enviada ao Storage, referenciada pelos documentos de `content_sections`/`site_metadata`. |
| `leads` | Um registro por envio do formulário de Material Técnico da LP pública. |

### Row Level Security

RLS está **habilitado nas quatro tabelas, sem nenhuma policy** para os papéis `anon`/`authenticated` — nenhuma linha é visível ou editável por essas roles, em nenhuma tabela. Todo acesso ao banco passa pela API (`apps/api`), que usa a chave secreta do lado do servidor (`service_role`, que ignora RLS); nenhum cliente (LP, painel) alcança o Postgres diretamente. Ver [`agent_context/SDD.md` § "Modelo de dados" → "Row Level Security"](../agent_context/SDD.md).

### Bucket de Storage

Bucket `images`, público apenas para **leitura** (`storage.buckets.public = true` + policy de `select` para todos os papéis) — a landing page lê imagens já publicadas sem autenticação. Escrita (`insert`/`update`/`delete`) não tem policy para `anon`/`authenticated`: só `service_role` grava direto; o upload feito pelo navegador do painel usa uma credencial temporária emitida pela API (SDD § Decisões técnicas e trade-offs), nunca uma policy permanente aberta.
