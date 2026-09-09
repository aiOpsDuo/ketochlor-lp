# Plano de Implementação — CMS Ketochlor LP

Derivado de: agent_context/SDD.md (versão aprovada em 2026-09-08)

## Política de branch/PR (porte Médio, ver SDD § Porte do projeto)

Branch por tarefa **obrigatória**, Pull Request **obrigatório** para integrar em `main`, e **revisão antes do merge obrigatória** (`references/git-workflow.md` § Checklist de revisão), conduzida pelo orquestrador como revisor explícito na ausência de um subagente de revisão dedicado no ambiente. Convenção de branch: `feature/{fase}-{nome-da-tarefa}` (ou `fix/`/`chore/` conforme a natureza da tarefa). Commits em Conventional Commits. Merge padrão: squash-merge via PR, sempre seguido de `git push` do resultado a `origin/main` — uma tarefa só é `concluída` depois disso (ver `SKILL.md` § Fase 4, passo 12).

## Tarefas

### Fase: fundacao

#### monorepo-workspaces — Configura npm workspaces na raiz
- Origem: planejada
- Descrição: Transforma a raiz do repositório em monorepo (`workspaces: ["apps/*", "packages/*"]`), com scripts `dev`, `build`, `typecheck`, `test` delegando aos workspaces.
- Rastreável a: SDD § Camadas e padrão arquitetural → Estrutura de pastas do repositório
- Critério de "pronto": `package.json` da raiz declara `workspaces`; `npm install` na raiz roda sem erro.
- Dependências: nenhuma
- Execução: sequencial (primeira a escrever `package.json`/`package-lock.json` da raiz — todas as demais tarefas de `fundacao` dependem dela)
- Toca documentação: sim — README § Stack e § Como rodar localmente precisam refletir a nova raiz de monorepo
- Status: concluída — PR #1 (squash-merge em `main`, `691783c`)

#### mover-lp-para-apps-lp — Move a LP atual para apps/lp
- Origem: planejada
- Descrição: Move `src/`, `public/`, `index.html`, `vite.config.ts`, `tailwind.config.ts`, `tsconfig.json` e `package.json` atuais para `apps/lp/`, ajustando caminhos e o nome do pacote (`@ketochlor/lp`), sem alterar comportamento visual.
- Rastreável a: SDD § Camadas e padrão arquitetural → Estrutura de pastas do repositório; Camadas T1
- Critério de "pronto": `npm run dev --prefix apps/lp` sobe a LP idêntica à atual; `npm run build --prefix apps/lp` gera `apps/lp/dist` sem erro.
- Dependências: fundacao/monorepo-workspaces
- Execução: sequencial (escreve `package-lock.json` da raiz via `npm install`)
- Toca documentação: não
- Status: concluída — PR #2 (squash-merge em `main`, `c8ccc50`)

#### scaffold-apps-admin — Scaffold inicial do painel
- Origem: planejada
- Descrição: Cria `apps/admin` (Vite + React + TypeScript + Tailwind, pacote `@ketochlor/admin`), com uma tela vazia servida em `/`.
- Rastreável a: SDD § Camadas e padrão arquitetural → Visão de tiers (T3)
- Critério de "pronto": `npm run dev --prefix apps/admin` sobe uma página em branco sem erro de build.
- Dependências: fundacao/monorepo-workspaces
- Execução: sequencial (escreve `package-lock.json` da raiz via `npm install`)
- Toca documentação: não
- Status: concluída — PR #3 (squash-merge em `main`, `c2487c6`)

#### scaffold-apps-api — Scaffold inicial da API
- Origem: planejada
- Descrição: Cria `apps/api` (NestJS 11, pacote `@ketochlor/api`) com módulo raiz e endpoint `GET /api/health`.
- Rastreável a: SDD § Camadas e padrão arquitetural → Visão de tiers (T4)
- Critério de "pronto": `npm run build --prefix apps/api` sem erro; `curl -s localhost:3000/api/health` retorna `200`.
- Dependências: fundacao/monorepo-workspaces
- Execução: sequencial (escreve `package-lock.json` da raiz via `npm install`)
- Toca documentação: não
- Status: concluída — PR #4 (squash-merge em `main`, `e3886cf`)

#### scaffold-packages-content-schema — Scaffold do pacote de esquema de conteúdo
- Origem: planejada
- Descrição: Cria `packages/content-schema` (pacote `@ketochlor/content-schema`) com build TypeScript próprio (`tsc`), sem conteúdo de domínio ainda.
- Rastreável a: SDD § Camadas e padrão arquitetural → Estrutura de pastas do repositório
- Critério de "pronto": `npm run build --prefix packages/content-schema` sem erro, gerando `dist/`.
- Dependências: fundacao/monorepo-workspaces
- Execução: sequencial (escreve `package-lock.json` da raiz via `npm install`)
- Toca documentação: não
- Status: concluída — PR #5 (squash-merge em `main`, `02392e7`)

#### ponto-unico-entrada-dev — Ponto único de entrada em desenvolvimento
- Origem: planejada
- Descrição: Configura o proxy do servidor de desenvolvimento de `apps/lp` (Vite) para encaminhar `/admin` a `apps/admin` e `/api` a `apps/api`, todos acessíveis por `http://localhost:5173`; adiciona script `dev` na raiz que sobe os três processos juntos.
- Rastreável a: SDD § Camadas e padrão arquitetural → Ponto único de entrada
- Critério de "pronto": com `npm run dev` na raiz, `curl http://localhost:5173/` (LP), `curl http://localhost:5173/admin` e `curl http://localhost:5173/api/health` respondem pelos processos corretos, todos na mesma porta.
- Dependências: fundacao/mover-lp-para-apps-lp, fundacao/scaffold-apps-admin, fundacao/scaffold-apps-api
- Execução: sequencial (edita `apps/lp/vite.config.ts`, já tocado por `mover-lp-para-apps-lp`)
- Toca documentação: sim — README § Como rodar localmente
- Status: concluída — PR #6 (squash-merge em `main`, `cc7d1ac`); atualização de README feita à parte no PR #7 (`f5537eb`) por ter ficado de fora da entrega original — registrado como lição para as próximas tarefas: instruir explicitamente o subagente a incluir a atualização de documentação no mesmo PR quando "Toca documentação: sim"

#### docker-single-entry — Empacotamento Docker de produção
- Origem: planejada
- Descrição: Dockerfile multi-stage (build de `lp`/`admin` como estáticos + imagem da `api`) e `docker-compose.yml` com proxy nginx atrás de porta única, replicando o mapa de caminhos de produção (`/`, `/admin`, `/api/*`).
- Rastreável a: SDD § Camadas e padrão arquitetural → Ponto único de entrada; Visão de tiers
- Critério de "pronto": `docker compose up --build` sobe os serviços com `healthcheck` passando; `curl http://localhost:8080/api/health` retorna `200`.
- Dependências: fundacao/ponto-unico-entrada-dev
- Execução: sequencial (depende do proxy já definido)
- Toca documentação: sim — `docs/DOCKER.md` (novo) + link em README § Saiba mais
- Status: concluída — PR #8 (squash-merge em `main`, `b40cb0f`); `docs/DOCKER.md` e link em README entregues na mesma PR

### Fase: dados

#### supabase-cli-init — Inicialização do Supabase local
- Origem: planejada
- Descrição: Inicializa a CLI do Supabase no repositório (`supabase/config.toml`), permitindo banco e storage locais para desenvolvimento, sem depender do projeto Supabase de produção para trabalhar no dia a dia.
- Rastreável a: SDD § Camadas e padrão arquitetural → Visão de tiers (T5)
- Critério de "pronto": `supabase start` sobe Postgres/Storage/Auth locais sem erro; `supabase stop` encerra limpo.
- Dependências: nenhuma
- Execução: sequencial (primeira a escrever `supabase/`)
- Toca documentação: sim — `docs/BANCO-DE-DADOS.md` (novo)
- Status: concluída — PR #9 (squash-merge em `main`, `d964d59`)

#### migration-content-sections — Tabela content_sections
- Origem: planejada
- Descrição: Migration SQL cria `content_sections` (`key` PK, `data jsonb`, `is_published`, `updated_at`, `updated_by`) e semeia as 11 linhas com `key` fechado (`hero`, `problema`, `fenotipos`, `mecanismo`, `tecnologia_sis`, `prova_autoridade`, `protocolo`, `diferenciais`, `material_tecnico`, `cta_secundario`, `faq`) com `data = '{}'`.
- Rastreável a: SDD § Modelo de dados → content_sections
- Critério de "pronto": `supabase db reset` aplica a migration sem erro; `select count(*) from content_sections` retorna `11`.
- Dependências: dados/supabase-cli-init
- Execução: sequencial (todas as migrations desta fase escrevem o mesmo schema/diretório `supabase/migrations`)
- Toca documentação: não (consolidado na última tarefa desta fase)
- Status: concluída — PR #10 (squash-merge em `main`, `5d2462b`)

#### migration-site-metadata — Tabela site_metadata
- Origem: planejada
- Descrição: Migration cria `site_metadata` como registro único (`id` fixo, `title`, `description`, `og_image_media_id`, `updated_at`, `updated_by`), sem coluna de URL canônica (ver SDD § Modelo de dados).
- Rastreável a: SDD § Modelo de dados → site_metadata
- Critério de "pronto": `supabase db reset` aplica sem erro; a linha única existe após a migration.
- Dependências: dados/migration-content-sections
- Execução: sequencial
- Toca documentação: não
- Status: concluída — PR #11 (squash-merge em `main`, `404af17`)

#### migration-media-assets — Tabela media_assets
- Origem: planejada
- Descrição: Migration cria `media_assets` (`id`, `storage_path`, `public_url`, `mime_type`, `size_bytes`, `original_filename`, `width`, `height`, `created_at`, `created_by`), sem coluna `kind` (só imagem nesta versão).
- Rastreável a: SDD § Modelo de dados → media_assets
- Critério de "pronto": `supabase db reset` aplica sem erro.
- Dependências: dados/migration-site-metadata
- Execução: sequencial
- Toca documentação: não
- Status: concluída — PR #12 (squash-merge em `main`, `cab6121`)

#### migration-leads — Tabela leads
- Origem: planejada
- Descrição: Migration cria `leads` (`id`, `nome`, `email`, `telefone`, `crmv`, `estado_cidade`, `especialidade`, `ja_cliente_virbac`, `deseja_contato_comercial`, `origem`, `created_at`), sem coluna de aceite LGPD (ver SDD § Modelo de dados, justificativa do precedente).
- Rastreável a: SDD § Modelo de dados → leads
- Critério de "pronto": `supabase db reset` aplica sem erro.
- Dependências: dados/migration-media-assets
- Execução: sequencial
- Toca documentação: não
- Status: concluída — PR #13 (squash-merge em `main`, `5728946`)

#### rls-e-storage — RLS nas quatro tabelas e bucket de imagens
- Origem: planejada
- Descrição: Habilita Row Level Security nas quatro tabelas sem nenhuma policy permissiva para os papéis anônimo/autenticado, e cria o bucket de Storage para imagens com policy equivalente (acesso só via API, exceto leitura pública de arquivo já publicado).
- Rastreável a: SDD § Modelo de dados → Row Level Security
- Critério de "pronto": `supabase db reset` aplica sem erro; uma consulta feita com a chave anônima diretamente ao Postgrest local é recusada para as quatro tabelas (verificação com `curl` contra a API REST local do Supabase).
- Dependências: dados/migration-leads
- Execução: sequencial
- Toca documentação: sim — completa `docs/BANCO-DE-DADOS.md` iniciado em `dados/supabase-cli-init`
- Status: concluída — PR #14 (squash-merge em `main`, `e0b38b1`). Fase `dados` concluída por completo.

### Fase: content-schema

#### definir-schemas-secoes — Esquemas das 11 seções + conteúdo inicial
- Origem: planejada
- Descrição: Implementa em `packages/content-schema/src` a validação e os tipos das 11 seções (campos de texto, listas de item, subestruturas fixas de `fenotipos`/`mecanismo`, campos de imagem com `alt` obrigatório), e o conteúdo inicial de cada seção migrado de `src/data/content.ts` (hoje em `apps/lp`), como fonte única consumida por API, painel e LP.
- Rastreável a: SDD § Modelo de dados → forma de `data` por seção; SDD § Riscos técnicos e mitigação (deriva de esquema)
- Critério de "pronto": `npm run build --prefix packages/content-schema` e `npm run test --prefix packages/content-schema` passam; um teste confirma que o conteúdo inicial de cada uma das 11 seções satisfaz o próprio esquema.
- Dependências: fundacao/scaffold-packages-content-schema, dados/migration-content-sections
- Execução: sequencial
- Toca documentação: sim — README § Manutenção ("adicionar um campo novo") aponta para este pacote
- Status: concluída — PR #15 (squash-merge em `main`, `f4f8503`); documentação em `docs/CONTEUDO-DA-LP.md`. Fase `content-schema` concluída por completo.

### Fase: api

#### dominio-esquemas-e-regras — Camada de Domínio
- Origem: planejada
- Descrição: Implementa em `apps/api` a camada de Domínio (sem import de framework nem de Supabase): validação de conteúdo reaproveitando `@ketochlor/content-schema`, regras de visibilidade de seção/item, invariantes do lead (nome/e-mail obrigatórios, consentimento obrigatório para o registro nascer).
- Rastreável a: SDD § Camadas e padrão arquitetural → Visão de layers (Domínio)
- Critério de "pronto": `npm run test --prefix apps/api -- domain` passa, cobrindo caminho feliz e rejeição por consentimento ausente.
- Dependências: content-schema/definir-schemas-secoes, fundacao/scaffold-apps-api
- Execução: sequencial
- Toca documentação: não
- Status: concluída — PR #16 (squash-merge em `main`, `c55ec7c`)

**Nota de design para as próximas tarefas (`api/infra-supabase-adapters`, `api/modulo-content`):** a visibilidade de item de lista (`ItemVisibilityMap`, em `apps/api/src/domain/visibilidade/filtrar-conteudo-publicado.ts`) é um mapa paralelo alinhado por ÍNDICE às listas do `data` da seção (os itens de `content-schema` não têm `id` estável). Isso só fica seguro se a persistência escrever `data` (com sua ordem/itens) e o mapa de visibilidade **atomicamente juntos, na mesma escrita** (o `PUT /api/admin/sections/:key` do painel reenvia a seção inteira a cada salvamento) — nunca como duas operações independentes que possam ficar dessincronizadas por reordenar/remover um item entre uma e outra. `api/infra-supabase-adapters` e `api/modulo-content` precisam decidir onde essa informação é persistida (coluna própria vs. dentro do mesmo `data`) respeitando essa restrição.

#### infra-supabase-adapters — Camada de Infraestrutura
- Origem: planejada
- Descrição: Implementa os adaptadores que satisfazem as portas do Domínio: repositórios Supabase para `content_sections`, `site_metadata`, `media_assets`, `leads`, e o verificador de token via JWKS.
- Rastreável a: SDD § Camadas e padrão arquitetural → Visão de layers (Infraestrutura); Regra de dependência
- Critério de "pronto": `npm run test --prefix apps/api -- infra` passa contra o Supabase local (`supabase start` de `dados/supabase-cli-init`).
- Dependências: api/dominio-esquemas-e-regras, dados/rls-e-storage
- Execução: sequencial
- Toca documentação: não
- Status: concluída — PR #17 (squash-merge em `main`, `35570b9`). `ItemVisibilityMap` persistido em `content_sections.item_visibility` (nova migration), sempre escrito junto com `data` no mesmo UPDATE. Verificador de token híbrido HS256/JWKS (`jose`), testado contra login real do Supabase local.

#### modulo-auth — Guard de autenticação
- Origem: planejada
- Descrição: Implementa o guard NestJS que verifica o token Supabase (JWKS) em toda rota `/api/admin/*`.
- Rastreável a: SDD § Contratos de dados/API/interfaces → Autenticação; PRD § Requerimentos sistêmicos (segurança de acesso)
- Critério de "pronto": `npm run test:e2e --prefix apps/api -- auth` passa: rota administrativa sem token → `401`; com token válido de teste → `200`.
- Dependências: api/infra-supabase-adapters
- Execução: sequencial (registra o guard em `app.module.ts`, arquivo compartilhado com os módulos abaixo)
- Toca documentação: sim — `docs/API.md` (novo), seção de autenticação
- Status: concluída — PR #18 (squash-merge em `main`, `744a279`). **Revisão encontrou e corrigiu, no mesmo PR, uma falha de segurança real**: o guard comparava `request.path` de forma sensível a maiúsculas/minúsculas contra `/api/admin`, mas o Express roteia sem diferenciar caixa por padrão — `/API/Admin/ping`/`/api/Admin/ping` bypassavam o guard (200 sem token). Corrigido com comparação case-insensitive + teste de regressão; reverificado manualmente pelo orquestrador antes do merge.

#### modulo-content — Módulo de conteúdo
- Origem: planejada
- Descrição: Módulo `content`: `GET /api/content` (público, só publicado), `GET /api/admin/sections`, `GET /api/admin/sections/:key`, `PUT /api/admin/sections/:key`, `PATCH /api/admin/sections/:key/visibility`.
- Rastreável a: SDD § Contratos de dados/API/interfaces → Conteúdo público / administrativo; SDD § Critérios de aceitação por capacidade (painel de edição por seção, controle de visibilidade)
- Critério de "pronto": `npm run test:e2e --prefix apps/api -- content` passa: `GET /api/content` nunca retorna seção/item não publicado; `PUT` com corpo inválido retorna `422`; `PUT`/`PATCH` sem token retornam `401`.
- Dependências: api/modulo-auth
- Execução: sequencial (mesmo `app.module.ts` de `modulo-auth`)
- Toca documentação: sim — `docs/API.md`
- Status: concluída — PR #20 (squash-merge em `main`, `1ec85d0`). `GET /api/content` sempre devolve as 11 chaves (seção não publicada = `null`, nunca omitida). `ItemVisibilityMap` preservado quando `PUT` omite `itemVisibility` (evita zerar visibilidade num salvamento que só mexe em texto). 49 testes e2e reais contra Supabase local.

#### modulo-metadata — Módulo de metadados
- Origem: planejada
- Descrição: Módulo `metadata`: `GET /api/admin/metadata`, `PUT /api/admin/metadata`.
- Rastreável a: SDD § Contratos de dados/API/interfaces → Conteúdo administrativo
- Critério de "pronto": `npm run test:e2e --prefix apps/api -- metadata` passa: leitura/escrita autenticada refletem no `GET /api/content` (campo `metadata`).
- Dependências: api/modulo-content
- Execução: sequencial (mesmo `app.module.ts`)
- Toca documentação: sim — `docs/API.md`
- Status: concluída — PR #22 (squash-merge em `main`, `5b11a4c`). `GET /api/content` agora inclui `metadata`. 62/62 testes da suíte completa.

#### modulo-media — Módulo de mídia
- Origem: planejada
- Descrição: Módulo `media`: `POST /api/admin/media/upload-url`, emitindo credencial temporária de upload direto ao Storage e o `id` reservado em `media_assets`.
- Rastreável a: SDD § Decisões técnicas e trade-offs (upload direto ao Storage); SDD § Riscos técnicos (upload interrompido)
- Critério de "pronto": `npm run test:e2e --prefix apps/api -- media` passa: endpoint exige token; credencial emitida expira após o tempo configurado; um upload interrompido não deixa `media_assets` referenciado por nenhuma seção.
- Dependências: api/modulo-metadata
- Execução: sequencial (mesmo `app.module.ts`)
- Toca documentação: sim — `docs/API.md`
- Status: concluída — PR #23 (squash-merge em `main`, `965bb1b`). Só o endpoint de emissão de credencial (único declarado no SDD); a confirmação pós-upload (`MediaAssetsRepository.criar`) já existia da tarefa de infra e permanece sem rota HTTP própria por não estar no contrato do SDD. 73/73 testes da suíte completa.

#### modulo-leads — Módulo de leads
- Origem: planejada
- Descrição: Módulo `leads`: `POST /api/leads` (público), `GET /api/admin/leads?from=&to=`, `GET /api/admin/leads/export.csv?from=&to=`, `DELETE /api/admin/leads/:id`.
- Rastreável a: SDD § Contratos de dados/API/interfaces → Leads; SDD § Critérios de aceitação por capacidade (registro, consulta e exportação de leads)
- Critério de "pronto": `npm run test:e2e --prefix apps/api -- leads` passa: envio válido cria um registro; envio sem consentimento retorna `422` e não cria registro; listagem respeita filtro de período e ordena do mais recente; exportação CSV tem cabeçalho com todos os campos; exclusão remove o registro.
- Dependências: api/modulo-media
- Execução: sequencial (mesmo `app.module.ts`)
- Toca documentação: sim — `docs/API.md`
- Status: concluída — PR #25 (squash-merge em `main`, `88f458a`). CSV formatado por função própria (RFC 4180, sem dependência nova). `LeadsRepository.excluir` passou a devolver `boolean` para sinalizar 404 sem query extra. **Fase `api` concluída por completo** — 84/84 testes na suíte final.

### Fase: painel

#### tela-login — Autenticação no painel
- Origem: planejada
- Descrição: Tela de login (e-mail/senha via Supabase Auth), sessão persistente entre recarregamentos, logout; qualquer rota sob `/admin` sem sessão redireciona ao login.
- Rastreável a: SDD § Critérios de aceitação por capacidade (autenticação de equipe, painel restrito)
- Critério de "pronto": em navegador, acessar `/admin/sections` sem sessão redireciona a `/admin/login`; login com credencial de teste válida chega à listagem de seções; logout volta a exigir login.
- Dependências: fundacao/scaffold-apps-admin, api/modulo-auth
- Execução: sequencial
- Toca documentação: sim — `docs/PAINEL.md` (novo), fluxo de login
- Status: concluída — PR #27 (squash-merge em `main`, `ec71d74`). Verificado em Chromium real (Playwright) pelo subagente e revalidado pelo orquestrador via chamada direta ao GoTrue local (login válido funciona, inválido retorna 400). `App.tsx` hoje é uma lista simples de rotas, sem layout/nav compartilhado ainda — `listagem-secoes`, `tela-metadados` e `tela-leads` (as três só dependem desta tarefa) vão todas precisar editar esse mesmo arquivo para registrar rota.

#### listagem-secoes — Lista de seções do painel
- Origem: planejada
- Descrição: Tela que lista as 11 seções na mesma ordem da LP, com indicação de publicado/não publicado.
- Rastreável a: SDD § Critérios de aceitação por capacidade (painel de edição por seção)
- Critério de "pronto": em navegador, a lista mostra exatamente as 11 seções, na ordem declarada no SDD, refletindo o estado real de `GET /api/admin/sections`.
- Dependências: painel/tela-login, api/modulo-content
- Execução: sequencial
- Toca documentação: sim — `docs/PAINEL.md`
- Status: concluída — PR #29 (squash-merge em `main`, `bc66b8f`). Criou também `AdminLayout` (nav compartilhada com links já prontos para `/metadata` e `/leads`) para permitir que `painel/tela-metadados` e `painel/tela-leads` rodem em paralelo com diff mínimo em `App.tsx` — decisão registrada a pedido do usuário (ver nota abaixo sobre execução paralela).

#### formulario-edicao-secao — Formulário de edição por seção
- Origem: planejada
- Descrição: Formulário gerado a partir de `@ketochlor/content-schema` para cada seção — campos de texto, listas com adicionar/editar/remover/reordenar, subestruturas fixas de `fenotipos`/`mecanismo` (sem opção de adicionar/remover item), upload de imagem com `alt` obrigatório — com confirmação visível de sucesso/erro ao salvar.
- Rastreável a: SDD § Critérios de aceitação por capacidade (edição de campos de texto, gestão de itens de lista, upload de imagem)
- Critério de "pronto": em navegador, editar um texto de qualquer seção e salvar reflete em `GET /api/content` sem novo build; tentar salvar uma imagem sem `alt` é bloqueado; a UI de `fenotipos`/`mecanismo` não oferece botão de adicionar/remover subestrutura.
- Dependências: painel/listagem-secoes, api/modulo-media, content-schema/definir-schemas-secoes
- Execução: sequencial
- Status: concluída — PR #34 (squash-merge em `main`, `e0570cd`). Formulário dirigido por introspecção do schema Zod de `@ketochlor/content-schema` (5 formas de campo, sem hardcode por seção). Upload de imagem real (direto ao Storage). Reverificado pelo orquestrador simulando o payload exato da UI (`data`+`itemVisibility` juntos) contra a API real — item oculto corretamente ausente de `GET /api/content`. **Gap conhecido e documentado, não bloqueante:** upload de imagem não cria registro em `media_assets` (não existe endpoint de confirmação pós-upload, fora do contrato do SDD para `api/modulo-media`) — a imagem funciona (URL pública válida), só falta o registro de bookkeeping.
- Toca documentação: sim — `docs/PAINEL.md`
- Status: pendente

#### controle-visibilidade — Visibilidade de seção e item
- Origem: planejada
- Descrição: Controle para marcar seção inteira ou item de lista como não publicado, sem apagar o conteúdo.
- Rastreável a: SDD § Critérios de aceitação por capacidade (controle de visibilidade)
- Critério de "pronto": em navegador, ocultar uma seção a remove de `GET /api/content` e da LP; reativar a traz de volta com o conteúdo inalterado.
- Dependências: painel/formulario-edicao-secao
- Execução: sequencial
- Toca documentação: sim — `docs/PAINEL.md`
- Status: concluída — PR #36 (squash-merge em `main`, `0eb605a`). Toggle de seção nunca inverte estado otimisticamente (sempre confia na resposta da API); toggle de item só move a posição do array de visibilidade, nunca remove o item. **Fase `painel` concluída por completo** (6 tarefas, 8 PRs contando as 2 de rebase/paralelismo).

#### tela-metadados — Edição de metadados da página
- Origem: planejada
- Descrição: Formulário de título, descrição e imagem de compartilhamento social.
- Rastreável a: SDD § Critérios de aceitação por capacidade (metadados de busca e compartilhamento)
- Critério de "pronto": em navegador, salvar reflete em `GET /api/admin/metadata` (verificação completa do reflexo no HTML fica em `seo/injetor-metadados`).
- Dependências: painel/tela-login, api/modulo-metadata
- Execução: **paralela** com `painel/tela-leads`, em worktree isolado — decisão explícita do usuário (2026-09-09), aceitando resolver um eventual conflito de merge trivial em `App.tsx` (uma linha de `<Route>` cada); `AdminLayout` (PR #29) já tem o link de nav pronto, então nenhuma das duas precisa tocá-lo
- Toca documentação: sim — `docs/PAINEL.md`
- Status: concluída — PR #31 (squash-merge em `main`, `08dbc44`). Estendeu `api-client.ts` (compatível com uso existente) para expor `erros` de validação por campo.

#### tela-leads — Consulta e exportação de leads
- Origem: planejada
- Descrição: Listagem de leads (mais recente primeiro) com filtro por período, exportação CSV e exclusão.
- Rastreável a: SDD § Critérios de aceitação por capacidade (consulta e exportação de leads)
- Critério de "pronto": com leads de teste no banco local, a tela lista na ordem correta, o filtro de período reduz a listagem e a exportação ao intervalo escolhido, e excluir um lead o remove permanentemente (verificação em navegador).
- Dependências: painel/tela-login, api/modulo-leads
- Execução: **paralela** com `painel/tela-metadados`, em worktree isolado — mesma decisão registrada acima
- Toca documentação: sim — `docs/PAINEL.md`
- Status: concluída — PR #32 (squash-merge em `main`, `01bfc4f`). Conflito trivial esperado em `App.tsx`/`docs/PAINEL.md` (uma rota de cada tarefa) resolvido pelo orquestrador via rebase; `api-client.ts` teve auto-merge limpo (helper compartilhado extraído por esta tarefa preservou o campo `erros` da outra). **Lição registrada:** worktrees isolam o checkout do git, mas não isolam serviços locais compartilhados (Supabase local, portas de dev) — as duas tarefas competiram pela mesma instância do Supabase local e por portas padrão, resolvido usando portas alternativas numa delas; processos órfãos (`vite` em 5173/5174) ficaram para trás e precisaram de limpeza manual do orquestrador ao final.

### Fase: lp

#### provider-conteudo-publicado — Provider de conteúdo publicado
- Origem: planejada
- Descrição: Cria `PublishedContentProvider` e `fetch-published-content` em `apps/lp`, que buscam `GET /api/content` em runtime, com fallback ao instantâneo de conteúdo local se a chamada falhar.
- Rastreável a: SDD § Riscos técnicos e mitigação (API indisponível); SDD § Contratos de dados/API/interfaces (instantâneo de conteúdo)
- Critério de "pronto": `npm run test --prefix apps/lp` cobre o caminho de fallback (API simulada fora do ar ainda resulta em conteúdo renderizável).
- Dependências: api/modulo-content, content-schema/definir-schemas-secoes, fundacao/ponto-unico-entrada-dev
- Execução: sequencial
- Toca documentação: não
- Status: concluída — PR #38 (squash-merge em `main`, `24ca1ed`). `apps/lp` não tinha vitest/@testing-library/react configurados (presunção errada minha no briefing) — adicionados nesta tarefa, alinhados à versão já usada no resto do monorepo. Provider ainda não montado em `App.tsx` (isso é `lp/migrar-secoes-para-cms`). 9/9 testes.

#### migrar-secoes-para-cms — Seções da LP consomem o CMS
- Origem: planejada
- Descrição: Reescreve Hero, Problema, Fenótipos, Mecanismo, TecnologiaSIS, ProvaAutoridade, Protocolo, Diferenciais, FormularioCTA (Material Técnico), CTASecundario e FAQ para ler do `PublishedContentProvider`, respeitando visibilidade de seção/item; remove a dependência de `src/data/content.ts` nesses componentes (Header e Footer continuam fixos, conforme PRD).
- Rastreável a: SDD § Critérios de aceitação por capacidade (consumo pelo front-end); PRD § Fora de escopo (Header/Footer fixos)
- Critério de "pronto": `grep -rl "from '../data/content'" apps/lp/src/components` retorna só `Header.tsx` e `Footer.tsx`; em navegador, a LP renderiza visualmente igual ao estado atual com o conteúdo inicial migrado.
- Dependências: lp/provider-conteudo-publicado
- Execução: sequencial
- Toca documentação: não
- Status: concluída — PR #40 (squash-merge em `main`, `1b84272`). Grep confirmado (só Header/Footer restam). Verificação visual em navegador real não foi possível no sandbox (sem display/root para libs do Chromium); substituída por teste de integração jsdom com fetch real contra API+Supabase local (não mockado) + revisão manual de fidelidade estrutural do orquestrador em 4 dos 11 componentes (mudança mecânica, sem alteração de markup). `content.ts` reduzido a `NAV_ITEMS`/`REFERENCIAS`/`FOOTER_LINKS` (únicos consumidores remanescentes: Header/Footer).

#### formulario-envia-lead — Formulário conectado ao backend
- Origem: planejada
- Descrição: Conecta `FormularioCTA` a `POST /api/leads`, substituindo a simulação atual (`// TODO` de Salesforce Marketing Cloud é removido, não implementado), mantendo a validação de campos obrigatórios e o aceite LGPD como condição de envio.
- Rastreável a: SDD § Critérios de aceitação por capacidade (registro de lead); PRD § Fora de escopo (sem CRM externo)
- Critério de "pronto": em navegador, submeter o formulário completo cria um registro verificável em `GET /api/admin/leads`; submeter sem marcar o aceite não envia e não cria registro.
- Dependências: api/modulo-leads, lp/migrar-secoes-para-cms
- Execução: sequencial
- Toca documentação: não
- Status: concluída — PR #42 (squash-merge em `main`, `6206f1e`). TODO de Salesforce removido (confirmado por teste de regressão que faz grep no próprio arquivo). Verificação real (não mock) contra API+Supabase local confirmou criação de lead e rejeição por consentimento ausente/API fora do ar. 24/24 testes.

#### instantaneo-de-conteudo — Script de instantâneo de conteúdo
- Origem: planejada
- Descrição: Script que gera `apps/lp/src/content/content-snapshot.json` a partir de `GET /api/content`, rodado antes do build da LP (`prebuild`).
- Rastreável a: SDD § Contratos de dados/API/interfaces (instantâneo de conteúdo)
- Critério de "pronto": rodar o script localmente atualiza o arquivo; `npm run build --prefix apps/lp` inclui o instantâneo atualizado no bundle.
- Dependências: lp/provider-conteudo-publicado
- Execução: sequencial
- Toca documentação: sim — README § Como rodar localmente (novo passo de build)
- Status: concluída — PR #44 (squash-merge em `main`, `443e552`). **Bug real encontrado e corrigido pelo próprio subagente**: a validação inicial só checava `sections`/`metadata` serem objetos — não bastava para rejeitar a resposta de um serviço diferente escutando por acaso na mesma porta default (aconteceu de verdade neste ambiente, com outro projeto na porta 3000). Corrigido checando as 11 chaves fechadas de `@ketochlor/content-schema`. Reproduzido e confirmado pelo orquestrador: com a porta 3000 ocupada por outro processo, o build rejeitou o conteúdo estranho e preservou o snapshot bom, sem falhar. **Fase `lp` concluída por completo** (4 tarefas, 4 PRs).

### Fase: seo

#### injetor-metadados — Injeção de metadados no HTML
- Origem: planejada
- Descrição: Implementa a função de borda (ou middleware equivalente em desenvolvimento) que insere `title`, `meta description` e `og:image` de `site_metadata` no HTML antes da resposta chegar ao navegador.
- Rastreável a: SDD § Critérios de aceitação por capacidade (metadados de busca e compartilhamento); PRD § Requerimentos sistêmicos (descoberta por buscadores)
- Critério de "pronto": `curl -s http://localhost:5173/ | grep -E "<title>|og:image"` mostra os valores salvos em `site_metadata`, sem executar JavaScript.
- Dependências: api/modulo-metadata, fundacao/docker-single-entry
- Execução: sequencial
- Toca documentação: sim — `docs/API.md` ou README, conforme onde a função de borda for descrita
- Status: concluída — PR #46 (squash-merge em `main`, `a8997f9`). Decisão de T2 refinada de "função de borda a escolher" para "injeção em tempo de build" (`agent_context/CHANGELOG.md`, 2026-09-09) — nginx puro não suporta montar a tag a partir de chamada de rede por requisição sem `njs`. Reverificado pelo orquestrador: com metadata preenchido, `dist/index.html` reescrito corretamente (título/description/og:image reais, sem JS); com metadata vazio, HTML preservado. **Gap descoberto (não corrigido aqui, registrado em `ajustes/docker-compose-env-api`)**: `docker-compose.yml` não passa nenhuma variável de ambiente do Supabase ao serviço `api`, que hoje exige essas variáveis para subir — herdado do comentário de `fundacao/docker-single-entry`, nunca atualizado quando `dados`/`api` passaram a exigi-las. **Fase `seo` concluída** (única tarefa).

### Fase: integracao

#### migracao-conteudo-inicial — Seed do conteúdo real do Ketochlor
- Origem: planejada
- Descrição: Roda a migração do conteúdo inicial definido em `@ketochlor/content-schema` para as linhas reais de `content_sections` do banco (local e, na implantação, do projeto Supabase novo do Ketochlor).
- Rastreável a: PRD § Premissas ("conteúdo hoje presente em `src/data/content.ts`... será migrado para o CMS como estado inicial")
- Critério de "pronto": `GET /api/content` devolve o conteúdo real do Ketochlor, comparado campo a campo com o hoje publicado em produção.
- Dependências: content-schema/definir-schemas-secoes, dados/migration-content-sections, api/modulo-content
- Execução: sequencial
- Toca documentação: não
- Status: concluída — PR #50 (squash-merge em `main`, `2745e3e`). `supabase/seed.sql` gerado a partir de `CONTENT_SECTIONS` (script em `apps/api/scripts/`), rodado automaticamente pelo Supabase CLI em todo `db reset`; `ON CONFLICT DO UPDATE` idempotente, só toca `data` (preserva `is_published`/`item_visibility` de edições do painel). Reverificado pelo orquestrador ponta a ponta (seed → banco → `GET /api/content`) com conteúdo real batendo campo a campo, e idempotência confirmada re-rodando o seed. Migração para o projeto Supabase de PRODUÇÃO real continua manual, documentada em `docs/BANCO-DE-DADOS.md` — nenhum projeto de produção foi provisionado (ação fora do alcance de um subagente).

#### verificacao-ponta-a-ponta — Verificação do fluxo completo
- Origem: planejada
- Descrição: Sobe o sistema completo (`npm run dev` e, ao menos uma vez, `docker compose up --build`) e verifica manualmente: editar seção no painel reflete na LP; enviar formulário na LP aparece em leads e é exportável; metadados salvos aparecem no HTML sem JS; falha simulada da API não quebra a LP.
- Rastreável a: SDD § Critérios de aceitação por capacidade (todas); PRD § Critérios de release
- Critério de "pronto": checklist acima confirmado nos dois ambientes (dev e Docker), com o resultado de cada item registrado nesta entrada do `PLAN.md`.
- Dependências: todas as tarefas de `fundacao`, `dados`, `content-schema`, `api`, `painel`, `lp` e `seo`
- Execução: sequencial
- Toca documentação: sim — insumo para a revisão final do README
- Status: concluída — PR #52 (squash-merge em `main`, `0ee6789`, correções encontradas durante a verificação). Checklist completo, verificado com comandos reais contra Supabase local + `docker compose up --build` (não simulado):
  1. Login real (Supabase Auth local, usuário de teste) — token obtido e usado nas chamadas seguintes.
  2. Editado `hero.heading` via `PUT /api/admin/sections/hero`; `GET /api/content` refletiu o novo texto imediatamente, sem rebuild.
  3. `PATCH /api/admin/sections/hero/visibility`: seção virou `null` em `GET /api/content` ao ocultar, voltou com o conteúdo intacto ao reativar.
  4. `POST /api/leads` real criou um lead; apareceu em `GET /api/admin/leads` e no `GET /api/admin/leads/export.csv` (CSV com cabeçalho e a linha certa).
  5. API derrubada (`docker compose stop api`): `curl http://localhost:8080/` continuou `200`, servindo o HTML/JS estático (o fallback ao instantâneo local em runtime já é coberto pela suíte de `PublishedContentProvider.test.tsx`/`App.test.tsx`, não reexecutado em browser real por falta de display no sandbox).
  6. `docker compose up --build`: `curl` em `/`, `/admin` e `/api/health` — todos `200`.
  7. Metadados reais publicados via `PUT /api/admin/metadata` (dentro do container, através do proxy) + rebuild da imagem `proxy` → `curl http://localhost:8080/` mostrou `<title>`/`<meta description>` reais no HTML puro, sem JS.
  8. `docker compose down` sem containers/volumes órfãos.

  **Dois bugs reais encontrados e corrigidos no processo (PR #52):** (a) `apps/api/src/main.ts` não carregava `.env` sozinho fora dos testes — corrigido com `dotenv/config`; (b) `.env.example` da raiz usava `127.0.0.1` para `SUPABASE_URL`/`SUPABASE_JWKS_URL`, que dentro do container `api` aponta para o próprio container, não o host do Supabase local — corrigido para `host.docker.internal`. Sem essa segunda correção, `docker compose up` subia e o healthcheck passava, mas toda rota que de fato falava com o Supabase (login, salvar, listar) falhava — um gap que só uma verificação genuinamente ponta a ponta (não só `/api/health`) revelou.

### Fase: documentacao

#### readme-e-docs-finais — Revisão final da documentação técnica
- Origem: planejada
- Descrição: Revisa `README.md` de ponta a ponta contra o que foi de fato implementado (comandos, variáveis de ambiente reais em `.env.example`, endpoints), garante que `/docs` (API, painel, banco de dados, Docker) está completo e linkado a partir de "Saiba mais".
- Rastreável a: `references/documentacao-tecnica.md` § Revisão final
- Critério de "pronto": todo comando listado no README foi executado e confirmado nesta revisão; nenhuma seção do README ultrapassa o teto do template.
- Dependências: integracao/verificacao-ponta-a-ponta
- Execução: sequencial
- Toca documentação: sim (é a própria tarefa)
- Status: concluída — PR #54 (squash-merge em `main`, `ebbe32f`). Todo comando do README reexecutado de verdade (dev, build, testes, Docker); seção "Status" atualizada de "em implementação" para completo; 5 divergências entre `/docs` e o código real corrigidas (referência a `dist/main.js`/`node:20-alpine` desatualizada em `docs/DOCKER.md`, variável `VITE_SUPABASE_STORAGE_BUCKET` faltando em `docs/PAINEL.md`, notas sobre telas/módulos "ainda não implementados" que já existiam). Reverificado pelo orquestrador: 84/84 (api) e 63/63 (lp) testes, build geral ok. **Plano de Implementação concluído por completo — todas as 8 fases (fundacao, dados, content-schema, api, painel, lp, seo, integracao) e a fase de cauda `ajustes` fechadas.**

### Fase: ajustes

Fase de cauda, sempre aberta — correções e pedidos do usuário descobertos na Fase 4 entram aqui.

#### readme-docker-primeiro — README com Docker como caminho principal + guia de rodar sem Docker
- Origem: pedido do usuário
- Descrição: o usuário pediu para seguir o mesmo padrão de documentação já usado no projeto irmão (Veggiedent, outra LP do mesmo cliente): README com Docker Compose como caminho PRINCIPAL de rodar o projeto (não `npm run dev`), e um documento separado (`docs/RODAR-SEM-DOCKER.md`) para quem precisa de recarga automática ou depurar um processo isolado. Adaptar a ESTRUTURA/prática (não copiar nenhum detalhe interno do outro projeto — são repositórios independentes, sem vínculo de dependência) à realidade real do Ketochlor: scripts, portas, variáveis e nomes de container reais deste projeto.
- Rastreável a: pedido direto do usuário em 2026-09-09 (fora do PRD/SDD original)
- Critério de "pronto": `README.md` § "Como rodar localmente" tem Docker Compose como único caminho apresentado ali; `docs/RODAR-SEM-DOCKER.md` (novo) documenta `npm run dev` e comandos relacionados, com todos os comandos executados de verdade nesta tarefa; `docs/DOCKER.md` revisado com o mesmo nível de detalhe operacional (quando reconstruir, o que quem publica precisa saber, verificação de que nenhum segredo vaza para o bundle do navegador, como derrubar).
- Dependências: documentacao/readme-e-docs-finais
- Execução: sequencial
- Toca documentação: sim (é a própria tarefa)
- Status: pendente

#### docker-compose-env-api — Repassa variáveis do Supabase ao serviço `api` do compose
- Origem: correção
- Descrição: `docker-compose.yml` não define nenhuma variável de ambiente (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`/`SUPABASE_JWKS_URL`) para o serviço `api` — `supabase-env.ts` (tarefa `api/infra-supabase-adapters`) exige essas variáveis e lança erro na inicialização sem elas, então `docker compose up --build` sobe o serviço `api` em crash-loop hoje. O comentário de topo do arquivo (herdado de `fundacao/docker-single-entry`, quando `dados`/`api` ainda não existiam) ficou desatualizado. Corrigir repassando as variáveis do `.env` da raiz (mesmo padrão de `apps/api/.env.example`) ao serviço `api` no `docker-compose.yml`, com valor obrigatório (`${VAR:?defina VAR no .env}`) igual ao já usado para as variáveis de build do `proxy`.
- Rastreável a: agent_context/CHANGELOG.md, entrada de 2026-09-09 (descoberta durante `seo/injetor-metadados`)
- Critério de "pronto": `docker compose up --build` sobe `api` sem crash-loop, `healthcheck` fica `healthy`; `curl http://localhost:8080/api/health` retorna `200`.
- Dependências: fundacao/docker-single-entry, api/infra-supabase-adapters
- Execução: sequencial
- Toca documentação: sim — `docs/DOCKER.md` (variáveis exigidas pelo `docker-compose.yml`), `.env.example` da raiz se ainda não existir um cobrindo essas variáveis para o compose
- Status: concluída — PR #48 (squash-merge em `main`, `bea4834`). Criado `.env.example` na raiz (não existia). **Três bugs adicionais e pré-existentes descobertos e corrigidos no mesmo PR** (documentados em `agent_context/CHANGELOG.md`): `packages/content-schema` nunca era buildado no Dockerfile antes de `lp`/`admin`/`api` (falha de build), `CMD` da imagem `api` apontava para `dist/main.js` em vez do real `dist/src/main.js` (o layout de output do `nest build` mudou desde `fundacao/docker-single-entry`), e a imagem `node:20-alpine` não tem `WebSocket` nativo exigido por `@supabase/realtime-js` em runtime (trocado para `node:22-alpine`). Reverificado pelo orquestrador: `docker compose up --build` completo, `api` healthy, `curl` em `/api/health`, `/` e `/admin` todos 200.

## Ordem de execução

```
fundacao/monorepo-workspaces
  → fundacao/mover-lp-para-apps-lp
  → fundacao/scaffold-apps-admin
  → fundacao/scaffold-apps-api
  → fundacao/scaffold-packages-content-schema
  → fundacao/ponto-unico-entrada-dev
  → fundacao/docker-single-entry

dados/supabase-cli-init
  → dados/migration-content-sections
  → dados/migration-site-metadata
  → dados/migration-media-assets
  → dados/migration-leads
  → dados/rls-e-storage

(fundacao/scaffold-packages-content-schema + dados/migration-content-sections)
  → content-schema/definir-schemas-secoes
  → api/dominio-esquemas-e-regras
  → (dados/rls-e-storage) → api/infra-supabase-adapters
  → api/modulo-auth → api/modulo-content → api/modulo-metadata → api/modulo-media → api/modulo-leads

painel/tela-login → painel/listagem-secoes → painel/formulario-edicao-secao → painel/controle-visibilidade
painel/tela-login → painel/tela-metadados
painel/tela-login → painel/tela-leads

lp/provider-conteudo-publicado → lp/migrar-secoes-para-cms → lp/formulario-envia-lead
lp/provider-conteudo-publicado → lp/instantaneo-de-conteudo

seo/injetor-metadados (após api/modulo-metadata e fundacao/docker-single-entry)

integracao/migracao-conteudo-inicial (após content-schema, dados/migration-content-sections, api/modulo-content)
integracao/verificacao-ponta-a-ponta (após tudo acima)
documentacao/readme-e-docs-finais (última)
```
