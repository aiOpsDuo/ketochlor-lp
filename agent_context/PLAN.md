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
- Descrição: Inicializa a CLI do Supabase no repositório (`supabase/config.toml`), permitindo banco e storage locais para desenvolvimento, sem depender de nenhum projeto Supabase remoto para trabalhar no dia a dia.
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
- Critério de "pronto": `GET /api/content` devolve o conteúdo real do Ketochlor, comparado campo a campo com o conteúdo real fornecido para a LP.
- Dependências: content-schema/definir-schemas-secoes, dados/migration-content-sections, api/modulo-content
- Execução: sequencial
- Toca documentação: não
- Status: concluída — PR #50 (squash-merge em `main`, `2745e3e`). `supabase/seed.sql` gerado a partir de `CONTENT_SECTIONS` (script em `apps/api/scripts/`), rodado automaticamente pelo Supabase CLI em todo `db reset`; `ON CONFLICT DO UPDATE` idempotente, só toca `data` (preserva `is_published`/`item_visibility` de edições do painel). Reverificado pelo orquestrador ponta a ponta (seed → banco → `GET /api/content`) com conteúdo real batendo campo a campo, e idempotência confirmada re-rodando o seed. **Atualização 2026-09-09:** o usuário provisionou um projeto Supabase de **homologação** do Ketochlor (ambiente de teste interno da equipe — não há projeto de produção do cliente) e forneceu as credenciais no chat; o orquestrador aplicou as 6 migrations e o `seed.sql` diretamente contra esse projeto (via `psql` em container Docker, já que a CLI exige um access token de conta que não foi fornecido — a conexão direta `db.<ref>.supabase.co` só resolve IPv6, inacessível deste sandbox; funcionou via Session Pooler, `aws-0-us-east-1.pooler.supabase.com:5432`, usuário `postgres.<ref>` — a região precisou ser descoberta por tentativa, ver `agent_context/CHANGELOG.md`). Verificado no projeto: RLS ativo nas 4 tabelas, bucket `images` criado, as 11 seções com conteúdo real e publicadas, chave publicável não alcança `content_sections` (RLS confirmado), JWKS acessível. Um usuário de teste (`dev@duo.studio`) foi criado no Supabase Auth de homologação e o login foi verificado. Nenhuma credencial foi persistida em nenhum arquivo do repositório.

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
- Status: concluída — PR #58 (squash-merge em `main`, `cb4f628`). **Bug real adicional encontrado e corrigido no mesmo PR**: `apps/api/package.json` tinha `"start": "node dist/main.js"`, quebrado desde que o layout de output do `nest build` mudou (mesma causa-raiz já corrigida no `docker/Dockerfile` em `ajustes/docker-compose-env-api`, mas nunca propagada a este script) — corrigido para `dist/src/main.js`. Reverificado pelo orquestrador: `npm run start --prefix apps/api` real → 200; `docker compose up --build` completo com varredura de segredo no bundle do proxy (0 ocorrências de `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_JWT_SECRET`, controle positivo confirmado); nenhuma menção ao projeto irmão em `README.md`/`docs/`; 84/84 (api) e 63/63 (lp) testes.

#### docker-compose-env-api — Repassa variáveis do Supabase ao serviço `api` do compose
- Origem: correção
- Descrição: `docker-compose.yml` não define nenhuma variável de ambiente (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`/`SUPABASE_JWKS_URL`) para o serviço `api` — `supabase-env.ts` (tarefa `api/infra-supabase-adapters`) exige essas variáveis e lança erro na inicialização sem elas, então `docker compose up --build` sobe o serviço `api` em crash-loop hoje. O comentário de topo do arquivo (herdado de `fundacao/docker-single-entry`, quando `dados`/`api` ainda não existiam) ficou desatualizado. Corrigir repassando as variáveis do `.env` da raiz (mesmo padrão de `apps/api/.env.example`) ao serviço `api` no `docker-compose.yml`, com valor obrigatório (`${VAR:?defina VAR no .env}`) igual ao já usado para as variáveis de build do `proxy`.
- Rastreável a: agent_context/CHANGELOG.md, entrada de 2026-09-09 (descoberta durante `seo/injetor-metadados`)
- Critério de "pronto": `docker compose up --build` sobe `api` sem crash-loop, `healthcheck` fica `healthy`; `curl http://localhost:8080/api/health` retorna `200`.
- Dependências: fundacao/docker-single-entry, api/infra-supabase-adapters
- Execução: sequencial
- Toca documentação: sim — `docs/DOCKER.md` (variáveis exigidas pelo `docker-compose.yml`), `.env.example` da raiz se ainda não existir um cobrindo essas variáveis para o compose
- Status: concluída — PR #48 (squash-merge em `main`, `bea4834`). Criado `.env.example` na raiz (não existia). **Três bugs adicionais e pré-existentes descobertos e corrigidos no mesmo PR** (documentados em `agent_context/CHANGELOG.md`): `packages/content-schema` nunca era buildado no Dockerfile antes de `lp`/`admin`/`api` (falha de build), `CMD` da imagem `api` apontava para `dist/main.js` em vez do real `dist/src/main.js` (o layout de output do `nest build` mudou desde `fundacao/docker-single-entry`), e a imagem `node:20-alpine` não tem `WebSocket` nativo exigido por `@supabase/realtime-js` em runtime (trocado para `node:22-alpine`). Reverificado pelo orquestrador: `docker compose up --build` completo, `api` healthy, `curl` em `/api/health`, `/` e `/admin` todos 200.

#### estiliza-painel-admin — Identidade visual do painel coerente com a LP
- Origem: pedido do usuário
- Descrição: o usuário pediu para estilizar `apps/admin` seguindo a MESMA ABORDAGEM já usada no painel do projeto irmão (Veggiedent, outra LP do mesmo cliente) — adaptada às cores reais do Ketochlor, nunca copiando valores/nomes daquele outro projeto (são repositórios independentes, sem vínculo de dependência). Padrão a replicar: um pacote pequeno e compartilhado de tokens de cor (só a marca, sem tipografia) consumido por `apps/admin/tailwind.config.ts` via `theme.extend.colors`; layout de painel com barra lateral (colapsável, com estado lembrado) + cabeçalho, conteúdo centralizado com largura máxima; componentes pequenos reaproveitáveis (cartão, aviso de sucesso/erro, barra de ação fixa no rodapé) em vez de um design system pronto; paleta neutra do Tailwind (`slate`) para UI utilitária, cor de marca só como acento (link ativo, hover); tipografia do painel deliberadamente neutra (fonte de sistema), não as fontes de marca da LP.
- Rastreável a: pedido direto do usuário em 2026-09-10 (fora do PRD/SDD original)
- Critério de "pronto": `packages/design-tokens` criado com as cores reais do Ketochlor (`navy`, `gold`, `blue.institutional`, `graytxt`, `lighttint`, `cardborder`, já usadas em `apps/lp/tailwind.config.ts`); `apps/admin` restilizado por completo (login, layout, listagem de seções, formulário de edição de seção — todos os tipos de campo —, metadados, leads) sem NENHUMA mudança de comportamento/lógica; `docker/Dockerfile` atualizado para buildar o novo pacote antes de `apps/admin` (mesma classe de bug já corrigida duas vezes nesta fase para `packages/content-schema`); tudo verificado em navegador real e via `docker compose up --build`.
- Dependências: painel/controle-visibilidade (última tarefa que tocou `apps/admin` antes desta)
- Execução: sequencial
- Toca documentação: sim — `docs/PAINEL.md` (nota curta sobre a identidade visual compartilhada)
- Status: concluída — PR #62 (squash-merge em `main`, `73aa3ab`). `packages/design-tokens` (sem build, TS puro) com as cores reais do Ketochlor, mesmos nomes já usados em `apps/lp`; `docker/Dockerfile` atualizado (só precisa do `package.json` do pacote, sem passo de build). Layout com sidebar recolhível (estado em localStorage) + gaveta mobile; componentes `Card`/`Notice`/`ActionBar`/`FormField` extraídos para `apps/admin/src/shared/`; cor de marca só como acento, botão primário em neutro (`slate-900`); dark mode deliberadamente não implementado (não pedido). **Bug real encontrado e corrigido pelo subagente**: variantes de erro/normal de borda de campo somadas em vez de mutuamente exclusivas — ordem alfabética das classes do Tailwind fazia a cor neutra vencer sobre a de erro, campo inválido aparecia sem destaque (só detectado em navegador real). Reverificado pelo orquestrador: build de todos os workspaces, 63/63 testes da LP, `docker compose build` (sem `up`, sem afetar os containers de homologação do usuário que seguiam rodando durante a tarefa), nenhuma menção ao projeto irmão.

#### corrige-imagem-metadados — Substitui og_image_media_id (uuid morto) por URL real de imagem
- Origem: pedido do usuário (achado de QA)
- Descrição: `site_metadata.og_image_media_id` (uuid, referência a `media_assets`) nunca teve como ser preenchido de verdade — nenhuma rota da API cria um registro em `media_assets` (o upload, tanto aqui quanto nas seções, só emite credencial de envio direto ao Storage e devolve a URL pública; o passo de confirmação que gravaria a linha em `media_assets` nunca foi implementado, gap já registrado em `painel/formulario-edicao-secao`). As imagens de SEÇÃO contornam isso guardando `{url, alt}` direto no conteúdo, sem depender de `media_assets` — só a tela de Metadados ficou presa ao modelo antigo. Corrigir alinhando `site_metadata` ao mesmo padrão: substituir a coluna por uma URL de texto, com upload real (mesmo componente/fluxo já usado nas seções) na tela de Metadados.
- Rastreável a: achado de QA do usuário em 2026-09-10; agent_context/SDD.md § Modelo de dados (site_metadata) — decisão revisada, registrar em CHANGELOG.md
- Critério de "pronto": migration renomeia/retipa `og_image_media_id` (uuid) → `og_image_url` (text); domínio/infraestrutura/aplicação/apresentação da API atualizados (`SiteMetadataRepository`, casos de uso, DTO); tela de Metadados do painel ganha upload real de imagem com preview (não mais caixa de texto de id); `apps/lp` (tipo `PublishedSiteMetadata`, `injetar-metadados.mjs`) atualizados para o novo nome de campo; tudo verificado contra Supabase LOCAL (o subagente não tem nem deve receber credenciais do Supabase de homologação — a mesma migration é aplicada lá separadamente pelo orquestrador, que já tem essas credenciais desta sessão).
- Dependências: ajustes/estiliza-painel-admin
- Execução: sequencial
- Toca documentação: sim — `agent_context/SDD.md` (Modelo de dados) + `agent_context/CHANGELOG.md`, `docs/API.md`, `docs/BANCO-DE-DADOS.md`, `docs/PAINEL.md`
- Status: concluída — PR #65 (squash-merge em `main`, `9d31387`). Migration `20260910120000_rename_site_metadata_og_image_to_url.sql` (`og_image_media_id` uuid → `og_image_url` text); `validar-site-metadata.ts` ganhou `ehUrlHttpValida()` (aceita `http(s)://...`, vazio/só-espaço vira `null`, formato inválido não vazio → 422); tela de Metadados agora reusa `enviarImagemParaStorage` (mesma função já usada nas imagens de seção) com preview real, sem campo de texto de id nem de `alt` (og:image não tem `alt` no schema). Reverificado pelo orquestrador contra Supabase LOCAL: `\d site_metadata` confirma o novo schema após `supabase db reset`; 91/91 testes da API e 63/63 da LP; build de todos os workspaces; três cenários manuais via curl (URL inválida → 422, URL válida → 200 salvo, vazio → limpa o campo) todos corretos; `docker compose build` (sem `up`) concluído sem afetar os containers do usuário, que seguiram `healthy`/`Up` durante toda a tarefa. Migration aplicada no Supabase de homologação do Ketochlor separadamente pelo orquestrador na sequência, conforme já registrado neste critério de "pronto" — detalhes em agent_context/CHANGELOG.md.

#### tema-escuro-logo-e-campo-de-imagem — Corrige lacunas da estilização do painel: tema escuro, logo real e campo de imagem sem caixa de URL
- Origem: pedido do usuário (correção de `ajustes/estiliza-painel-admin` — a entrega anterior não incluiu tema escuro, o campo de imagem manteve uma caixa de texto de URL editável, e o topo do menu lateral usa um selo com a letra "K" em vez do logo real do site)
- Descrição: quatro lacunas concretas apontadas pelo usuário ao comparar com o painel de referência (mesmo padrão visual, já usado como base em `ajustes/estiliza-painel-admin`):
  1. **Tema escuro nunca foi implementado** — `apps/admin/tailwind.config.ts` decidiu explicitamente não declarar `darkMode` ("o painel não tem alternador de tema"). Reverter essa decisão: `darkMode: 'class'`, um `ThemeProvider` (preferência salva em `localStorage`, padrão = preferência do sistema operacional quando não há escolha salva) e um botão de alternância no cabeçalho, com variante `dark:` em TODO componente/tela do painel (login, layout/menu lateral/gaveta mobile, listagem de seções, formulário de edição de seção — todos os tipos de campo —, metadados, leads, e os componentes compartilhados `Card`/`Notice`/`ActionBar`/`FormField`/`classes.ts`).
  2. **Campo de imagem com caixa de texto "URL da imagem"** — tanto em `pages/sections/components/image-field.tsx` (imagens de seção) quanto em `pages/metadata/metadata-page.tsx` (imagem de metadados) — remover essa caixa de texto por completo; o operador nunca deve ver nem editar uma URL crua. Substituir por uma área de soltar/enviar (dropzone): retângulo de borda tracejada, ícone quando vazio, prévia da imagem preenchendo a área quando enviada, spinner + porcentagem durante o envio, botão de excluir circular sobreposto no canto inferior direito (nunca dentro do `<label>` do dropzone, para não abrir o seletor de arquivo ao clicar nele). Sem serviço de resolução de mídia por id (`media_assets` não é gravado de verdade neste projeto — gap já registrado em `painel/formulario-edicao-secao`): o estado "tem imagem" vem diretamente de o valor do campo (a URL) ser não vazio, sem nenhuma chamada de rede adicional.
  3. **Botões com aparência divergente** — depois de (1), aplicar variante escura às classes de botão/campo/etiqueta de `shared/classes.ts` (o padrão de cor já é o mesmo: `slate-900` no botão primário, contorno `slate-300` no secundário); a divergência apontada pelo usuário é justamente a ausência de tema escuro quando o sistema operacional está em modo escuro, não a paleta em si.
  4. **Sem logo real no topo do menu lateral** — `MarcaDoPainel` (em `layout/admin-layout.tsx`) usa hoje um selo decorativo com a letra "K", por decisão deliberada da tarefa anterior ("no lugar de um logo que o painel não precisa"). Reverter: usar o logo real do Ketochlor (`apps/lp/public/assets/logo-ketochlor-transp.png`, o mesmo que `Header.tsx`/`Footer.tsx` da LP já servem) no topo da barra lateral (desktop) e da gaveta (mobile). Como esse arquivo é um asset estático da LP, e não uma URL pública de Storage como no painel de referência, e `apps/admin` não pode importar de dentro de `apps/lp`, copiar o arquivo para `apps/admin/public/assets/` — uma duplicação de binário deliberada e documentada (não um descuido), aceita porque o logo do Ketochlor não está hospedado no Storage (diferente do painel de referência, onde o mesmo logo em Storage já era compartilhável por URL entre os dois apps).
- Rastreável a: pedido do usuário em 2026-09-10 (comparação direta com o painel do outro produto da mesma marca, usado como referência de padrão desde `ajustes/estiliza-painel-admin`); `docs/PAINEL.md`
- Critério de "pronto": alternância de tema funciona (persiste entre visitas, respeita preferência do sistema quando não há escolha salva) em TODAS as telas do painel, sem nenhuma tela esquecida; nenhum campo de imagem do painel mostra ou aceita uma URL digitada — só upload real via dropzone, com preview, estado de envio e exclusão; logo real do Ketochlor visível no topo do menu lateral (desktop) e da gaveta (mobile); tudo verificado em navegador real (Playwright), claro e escuro, incluindo o fluxo de upload de imagem de ponta a ponta contra Supabase LOCAL; testes automatizados e build completo continuam passando; `docker compose build` (sem `up`) sem afetar os containers de homologação do usuário.
- Dependências: ajustes/estiliza-painel-admin, ajustes/corrige-imagem-metadados
- Execução: sequencial
- Toca documentação: sim — `docs/PAINEL.md` (reverte a nota "sem tema escuro" e a nota "sem logo, só selo")
- Status: concluída
- Resumo da verificação: `ThemeProvider`/`useTheme` (`apps/admin/src/theme/theme-context.tsx`) + `darkMode: 'class'` — variante `dark:` adicionada em toda tela e componente compartilhado do painel, sem exceção. Logo real (`apps/lp/public/assets/logo-ketochlor-transp.png`, copiado para `apps/admin/public/assets/`) no lugar do selo "K", na barra de desktop e na gaveta mobile. Campo de imagem virou dropzone compartilhado (`apps/admin/src/shared/Dropzone.tsx`) sem nenhuma caixa de "URL da imagem", nas duas telas que a tinham (seções e metadados). Verificado em navegador real (Playwright/Chromium) contra Supabase local: tema respeita `prefers-color-scheme` sem escolha salva (checado nos dois sentidos), alternância manual persiste em `localStorage` e sobrevive a reload, todas as telas percorridas nos dois temas, upload real de imagem de teste + prévia (URL pública real do Storage) + exclusão confirmados no campo de seção e no de metadados, logo real carrega e é visível tanto na barra quanto na gaveta mobile — 18/18 verificações do script passaram. `npm run test --workspaces` (91+63+23 = 177 testes, `apps/admin` sem script de teste) e `npm run build --workspaces` (ordem documentada em `docker/Dockerfile`: `content-schema` antes de `lp`/`admin`/`api`) passam sem erro. `docker compose build` (sem `up`) concluiu sem erro; containers de homologação do usuário (`ketochlor-lp-api-1`/`ketochlor-lp-proxy-1`) permaneceram saudáveis e intocados. Ver `agent_context/CHANGELOG.md` (entrada 2026-09-10) para o detalhamento completo.

#### corrige-layout-formularios-menu-e-nomenclaturas — Unifica os formulários em um só bloco, corrige o campo de imagem, o topo do menu, o cabeçalho e as nomenclaturas
- Origem: pedido do usuário (nova rodada de QA visual, com capturas de tela do painel de referência anexadas ao pedido)
- Descrição: seis correções concretas de layout/nomenclatura, todas comparadas diretamente ao painel de referência (mesmo usado desde `ajustes/estiliza-painel-admin`):
  1. **Formulário em vários bloquinhos separados, deveria ser um só.** Hoje `SectionDetailPage` (`pages/sections/section-detail-page.tsx`) envolve CADA campo de topo de seção no próprio `<Card>` (`descritores.map((d) => <Card key={d.chave}>...</Card>)`). O padrão de referência (`SectionForm.tsx`/`FieldControl.tsx` do painel de referência) usa só UM `Card` para todos os campos simples (texto, imagem, lista de textos soltos, estrutura fixa) — e um bloco PRÓPRIO (fieldset com borda, não um `Card`) só para cada campo de LISTA DE ITENS estruturados (ex. FAQ, dosagem — o que hoje é o tipo `lista-item`), exatamente como uma lista de FAQ já é visualmente distinta de um campo de texto simples. Replicar essa mesma divisão: um `Card` único para os tipos `texto`/`imagem`/`lista-texto`/`estrutura-fixa`, e cada `lista-item` continua com seu próprio destaque visual — mas como um fieldset com borda própria (`rounded-lg border ... bg-white ... p-4`, com variante `dark:`), já que deixa de estar dentro de um `Card` que lhe dava essa moldura antes. A tela de Metadados (`pages/metadata/metadata-page.tsx`) já usa um único `Card` — não precisa mudar nesse ponto.
  2. **Campo de imagem não cobre a largura do formulário.** O `Dropzone` (`shared/Dropzone.tsx`) foi encaixado numa coluna estreita (`w-full sm:w-56`) ao lado do campo `alt`, tanto em `ImageFieldEditor` (seções) quanto em `MetadataPage`. No padrão de referência a imagem cobre a LARGURA TOTAL do formulário, e o campo `alt` (quando existe) vem DEPOIS dela, empilhado, não ao lado. Ajustar as duas telas: `Dropzone` com `w-full` (sem limite de largura), campo `alt` abaixo dele.
  3. **Logo do menu lateral com texto ao redor, pequeno e alinhado à esquerda.** `LogoDoPainel` (`layout/admin-layout.tsx`) hoje mostra o `<img>` do logo (`h-8`) seguido do texto "Ketochlor". Remover o texto por completo — só o logo —, centralizar horizontalmente dentro do espaço da marca, e aumentar o tamanho (ex. `h-12`/`h-14`, a critério de quem implementa, desde que visivelmente maior que o atual `h-8`).
  4. **Texto "Painel Ketochlor" no cabeçalho.** Remover esse `<span>` do cabeçalho (`admin-layout.tsx`) por completo — o cabeçalho passa a não ter mais um título fixo à esquerda (só o botão de abrir menu, em mobile).
  5. **Ordem dos itens do cabeçalho.** Hoje: e-mail do operador → alternador de tema → botão "Sair". No padrão de referência a ordem é: alternador de tema → e-mail do operador → botão "Sair". Reordenar.
  6. **Botão "Voltar" fora da barra de ação, com o texto errado.** `SectionDetailPage` tem hoje um link "Voltar para as seções" solto ACIMA do título da página. No padrão de referência esse link mora DENTRO da própria `ActionBar` fixa do rodapé, ao lado esquerdo (`start`), com o botão de salvar à direita (`end`) — a `ActionBar` de lá aceita `start`/`end` em vez de um único `children`. Ajustar `shared/ActionBar.tsx` para aceitar `start`/`end` (children continua não fazendo sentido depois dessa mudança — todo uso atual de `ActionBar` no projeto precisa ser migrado para a nova prop, incluindo `MetadataPage`, que não tem `start` e por isso só passa `end`). O texto do link muda para "Voltar para a lista de seções" (era "Voltar para as seções"), e o botão de salvar da tela de seção ganha o mesmo texto do padrão de referência, "Salvar e publicar" (era só "Salvar"), com o ícone `Save` ao lado (a tela de Metadados mantém "Salvar", que já está correto — ela não "publica" uma seção).
  7. **Nomenclatura dos módulos do menu diferente do padrão de referência.** Renomear as entradas de `LINKS_DE_NAVEGACAO` (`admin-layout.tsx`) para o mesmo texto usado lá: "Seções" → "Seções da página", "Metadados" → "Metadados da página", "Leads" → "Leads recebidos". Os ícones também passam a coincidir com os de lá: Seções continua com `LayoutList`/`FileText` (ícone livre, mas mantenha um de listagem), Metadados continua com `Tags`, Leads passa a usar `Inbox` (era `Users` — o padrão de referência reserva `Users` para o módulo de Operadores, adicionado na próxima tarefa).
- Rastreável a: pedido do usuário em 2026-09-10 (com capturas de tela do painel de referência anexadas)
- Critério de "pronto": as 7 correções acima, cada uma comparável lado a lado com as capturas de tela do pedido; nenhuma tela ficou com um `Card` a menos ou a mais do que o padrão descrito no item 1; testes automatizados e build completo continuam passando; verificado em navegador real (claro e escuro); `docker compose build` (sem `up`) sem afetar os containers de homologação do usuário.
- Dependências: ajustes/tema-escuro-logo-e-campo-de-imagem
- Execução: sequencial
- Toca documentação: sim — `docs/PAINEL.md` (nomenclaturas do menu, estrutura do formulário)
- Status: concluída
- Resumo da verificação: as 7 correções implementadas e revisadas linha a linha contra a descrição acima. `SectionDetailPage` agrupa `texto`/`imagem`/`lista-texto`/`estrutura-fixa` num único `Card` (`camposSimples`) e cada `lista-item` (ex. FAQ) fora dele, com o fieldset com borda própria que `ItemListFieldEditor` já trazia. `Dropzone` em `w-full` (sem `sm:w-56`) em `ImageFieldEditor` e `MetadataPage`, `alt` empilhado abaixo. Logo sem texto "Ketochlor" ao lado, maior (`h-12` expandida, `h-8` recolhida) e centralizado. "Painel Ketochlor" removido do cabeçalho; ordem tema→e-mail→sair. `ActionBar` migrada de `children` para `start`/`end` (único outro uso, `MetadataPage`, migrado junto); "Voltar para a lista de seções" dentro da barra como `start`; botão de seção "Salvar e publicar" com ícone `Save` (Metadados mantém "Salvar"). Menu: "Seções da página"/"Metadados da página"/"Leads recebidos", ícone de Leads trocado de `Users` para `Inbox`. **Bug real encontrado e corrigido durante esta verificação, não presente no diff original do subagente interrompido:** por ser `fixed inset-x-0`, a `ActionBar` ocupa a largura da viewport inteira, não a do conteúdo recuado pela barra lateral — o novo conteúdo `start` (à esquerda) renderizava parcialmente atrás da barra lateral fixa em telas largas (o `end`, único conteúdo existente antes desta tarefa, nunca expôs o problema por ficar alinhado à direita, longe da barra lateral). Corrigido expondo a largura da barra lateral como variável CSS (`--admin-sidebar-largura`, definida por `AdminLayout`) e deslocando a `ActionBar` com `lg:left-[var(--admin-sidebar-largura)]` — confirmado em navegador real com a barra expandida, recolhida e em mobile (gaveta). Verificado em navegador real (Playwright/Chromium) contra Supabase LOCAL, claro e escuro: login, listagem de seções, edição da seção "FAQ" (tem `lista-item` e é usada para a verificação), edição da seção "Hero" (tem `imagem`), Metadados e Leads — todas as 7 correções conferidas visualmente. Fluxo real de salvar testado e funcionando: seção (FAQ/Hero) via "Salvar e publicar" e Metadados via "Salvar", ambos com notificação de sucesso confirmada. `npm run test --workspaces` (91 api + 63 lp + 23 content-schema = 177 testes, `apps/admin` sem script de teste) e `npm run typecheck --workspaces` e `npm run build --workspaces` sem erro, antes e depois da correção do bug da `ActionBar`. `docker compose build` (sem `up`, usando `.env` temporário com os defaults públicos e conhecidos do Supabase local, removido logo depois) concluiu sem erro; containers de homologação do usuário (`ketochlor-lp-api-1`/`ketochlor-lp-proxy-1`) permaneceram saudáveis e intocados antes e depois. `grep -ri` pelo nome do produto de referência no diff: vazio (convenção do projeto já usa só "painel de referência", mantida). Limpeza: usuário de teste removido do Supabase Auth local (`DELETE /auth/v1/admin/users/:id`, HTTP 200), `npx supabase stop` executado, processos de `npm run dev` desta verificação E de uma sessão anterior interrompida (deixados rodando, PIDs 90770/90771/90812) encerrados por PID específico — nenhum `pkill` genérico usado.

#### modulo-operadores — Adiciona o módulo de gestão de operadores do painel
- Origem: pedido do usuário ("adicione o mesmo módulo de operadores presente" no painel de referência)
- Descrição: um módulo novo, de ponta a ponta (API + painel), que não existe hoje no Ketochlor — gestão de quem tem acesso administrativo ao painel. Sem tabela própria no banco: o Supabase Auth (Admin API) já é a única fonte de identidade de operador (é dele que vem o JWT verificado por `AuthGuard`), então este módulo só fala com `auth.admin.*` (`listUsers`/`createUser`/`deleteUser`), nunca com uma tabela `operators` nova.
  - **API** (mesma divisão em camadas já usada por `modulo-metadata`/`modulo-leads`, adaptada — sem tabela, o "repositório" é um adaptador do Supabase Auth Admin API, não do Postgres): domínio (`Operador`, e o erro `RemocaoOperadorRecusadaError` com motivo `'proprio'` ou `'ultimo-operador'`), aplicação (casos de uso listar/criar/remover), infraestrutura (`auth.admin.listUsers/createUser/deleteUser`, `email_confirm: true` na criação — a conta nasce pronta para logar, sem link nem e-mail de convite), apresentação (`GET`/`POST`/`DELETE /api/admin/operators`, já protegidas pelo `AuthGuard` global por estarem sob `/api/admin`). Duas regras de negócio, checadas ANTES de chamar a Admin API: recusar remover a própria conta (o operador do token, via `request.usuario.sub`) e recusar remover o último operador restante — as duas travariam o próprio acesso ao painel; a API responde `409` nos dois casos (`ConflictException`, seguindo o mesmo padrão de captura de erro de domínio já usado em `content-admin.controller.ts`/`chave-secao-invalida.error.ts`, não um filtro de exceção global novo). Validação de campo (e-mail, senha mínima de 6 caracteres — mínimo do próprio Supabase Auth —, nome obrigatório) segue o padrão já usado em `validar-site-metadata.ts`: uma função pura no Domínio, sem `class-validator` (não é dependência deste projeto), devolvendo o formato uniforme `{erros: [{campo, mensagem}]}` em `422`.
  - **Painel**: nova tela `pages/operators/operators-page.tsx` — formulário para criar operador (nome, e-mail, senha inicial) e tabela dos operadores existentes (nome, e-mail, criado em, último login, ação de remover). Remover exige confirmação em dois passos na própria linha (mesmo padrão já usado em `LeadsPage`), e fica desabilitado — com o motivo visível — para a própria conta e para o único operador restante (a mesma recusa que a API impõe, antecipada aqui para o operador nunca precisar tentar para descobrir). Nova entrada "Operadores" em `LINKS_DE_NAVEGACAO` (ícone `Users`), nova rota `/operators` em `App.tsx`.
- Rastreável a: pedido do usuário em 2026-09-10; `docs/API.md`, `docs/PAINEL.md`, `agent_context/SDD.md` (novo módulo, novo endpoint)
- Critério de "pronto": criar, listar e remover operador funcionam de ponta a ponta contra Supabase LOCAL; recusa de remover a própria conta e o último operador verificada tanto no painel (botão desabilitado com motivo) quanto diretamente na API (409, contornando o painel); testes automatizados (novos, cobrindo as duas regras de recusa e a validação de campo) e build completo passam; verificado em navegador real; `docker compose build` (sem `up`) sem afetar os containers de homologação do usuário.
- Dependências: corrige-layout-formularios-menu-e-nomenclaturas (usa a mesma `LINKS_DE_NAVEGACAO`/`ActionBar` já corrigidas, para não conflitar com aquela tarefa)
- Execução: sequencial
- Toca documentação: sim — `docs/API.md` (novo endpoint), `docs/PAINEL.md` (nova tela), `agent_context/SDD.md` (novo módulo)
- Status: concluída
- Resumo da verificação: módulo implementado de ponta a ponta seguindo exatamente a divisão em camadas de `modulo-metadata`/`modulo-leads` (domínio `apps/api/src/domain/operators/` — `Operador`, `RemocaoOperadorRecusadaError` com `motivo: 'proprio' | 'ultimo-operador'`, `validarCriacaoOperador`; porta `domain/portas/operadores.repository.ts`; aplicação `application/operators/` com os 3 casos de uso; infraestrutura `infrastructure/supabase/operadores.repository.ts` contra `auth.admin.listUsers/createUser/deleteUser`, `email_confirm: true`; apresentação `presentation/operators/` — `OperatorsAdminController`, `OperatorsModule`, registrado em `app.module.ts`). Painel: `pages/operators/operators-page.tsx`, entrada "Operadores" (ícone `Users`) em `LINKS_DE_NAVEGACAO`, rota `/operators` em `App.tsx`. **Testes automatizados**: 10 testes de domínio (`validar-criacao-operador.test.ts`) + 4 de unidade do caso de uso de remoção com repositório falso (`remover-operador.use-case.test.ts`, cobre isoladamente o ramo `'ultimo-operador'` — ver nota abaixo) + 9 e2e reais contra Supabase local (`operators.e2e.test.ts`: 401 sem token em GET/POST, 422 para e-mail/senha/nome inválidos, criação com sucesso + login real da conta recém-criada sem confirmação de e-mail, listagem, remoção com sucesso, remoção da própria conta → 409, remoção de id inexistente → 404) — 23 testes novos, todos passando. Suíte completa do workspace `apps/api`: 18 arquivos, 114 testes, sem falhas (nenhum teste pré-existente quebrado). `npm run test --workspaces`: 114 (api) + 63 (lp) + 23 (content-schema) = 200 testes, sem falhas; `apps/admin` continua sem script de teste automatizado (pré-existente). `npm run build --workspaces` e `nest build`/`tsc -b`/`vite build` de cada app sem erro. **Nota sobre o ramo `'ultimo-operador'`:** é estruturalmente inatingível via HTTP real neste modelo (operador = todo usuário do Supabase Auth) — quem chama só tem um JWT válido se é, ele mesmo, um operador existente, então uma lista de tamanho 1 nunca contém um alvo diferente de quem chama; o caso `'proprio'` sempre intercepta primeiro. Coberto isoladamente por teste de unidade com repositório falso, e a UI foi verificada com uma resposta de API fabricada via `page.route` do Playwright (ver abaixo), sem apagar operadores reais do Supabase local compartilhado. **Verificado em navegador real** (Playwright/Chromium contra Supabase LOCAL, `npm run dev`, único ponto de entrada `http://localhost:5173/admin`): login, tela `/operators` carregada com a tabela de operadores pré-existentes; criação de um operador pelo formulário (botão desabilitado até os 3 campos preenchidos, "Criando…" durante o envio) — apareceu na tabela imediatamente; login com a conta recém-criada em um segundo contexto de navegador confirmou que ela funciona sem nenhuma confirmação de e-mail adicional; célula de ações da própria conta logada mostrou o texto "Sua própria conta" (sem botão de remover); remoção do operador criado via fluxo de dois cliques (Remover → Confirmar) confirmada, linha desapareceu da tabela. Cenário "único operador restante" verificado via interceptação de `GET /api/admin/operators` (`page.route`) devolvendo uma lista fabricada de tamanho 1: a UI mostrou corretamente "Único operador restante" e ocultou o botão de remover. **Verificado direto na API via `curl`** (contornando o painel, com token real de login): `DELETE` da própria conta → `409` real (`{"message":"Você não pode remover a própria conta."}`); `POST` com e-mail inválido → `422` com `erros: [{campo: "email", ...}]`; `DELETE` de id inexistente → `404`; `GET` sem token → `401`. `docker compose build` (sem `up`, `.env` copiado do checkout principal para o worktree e removido depois) concluiu sem erro para as imagens `api` e `proxy`; containers de homologação do usuário (`ketochlor-lp-api-1`/`ketochlor-lp-proxy-1`) permaneceram com o mesmo tempo de atividade antes e depois (nunca reiniciados). `grep -iE` por nomes de produtos de referência conhecidos (Retool, Forest Admin, Directus, Strapi, AdminJS, react-admin, etc.) no diff inteiro: vazio. Limpeza: usuário de teste de login (`qa.operadores.principal@ketochlor.local`) removido do Supabase Auth local ao final (`DELETE /auth/v1/admin/users/:id` → 200); os 3 usuários pré-existentes de sessões de QA anteriores (`qa-teste-layout`, `operador.teste`, `verif-meta`) foram preservados intocados — o Supabase local é compartilhado entre todos os worktrees deste repositório (mesmo `project_id`), então nenhuma conta pré-existente foi apagada. `npx supabase stop` executado; processos de `npm run dev` (duas execuções, a segunda após criar `apps/admin/.env` que faltava) encerrados por PID específico (nunca `pkill` genérico) — incluindo um processo remanescente da primeira execução (porta 3000) identificado e encerrado à parte.

#### migracao-mysql-infra-compose — Provisiona MySQL e MinIO no docker-compose
- Origem: pedido do usuário (decisão de 2026-09-21, ver `agent_context/CHANGELOG.md`)
- Descrição: adiciona os serviços `mysql` (MySQL 8, volume nomeado persistente, `healthcheck` via `mysqladmin ping`, usuário de aplicação dedicado sem privilégio de DDL em runtime) e `minio` (volume nomeado persistente, `healthcheck` via `/minio/health/live`, bucket de imagens criado no start via `mc` ou script de inicialização) ao `docker-compose.yml`. Nenhum dos dois publica `ports` para o host — só alcançáveis pela rede interna do compose, mesmo padrão já usado pelo serviço `api`. Adiciona as variáveis correspondentes (`MYSQL_*`, `MINIO_*`) ao `.env.example` da raiz, lado a lado com as `SUPABASE_*` existentes (ainda não removidas — a `api` continua rodando contra Supabase até `migracao-mysql-cutover-wiring`). Não altera nenhum código de `apps/`.
- Rastreável a: SDD § "Migração de plataforma de dados" (nota após a tabela de tiers)
- Critério de "pronto": `docker compose up mysql minio` (sem `api`/`proxy`) sobe os dois serviços com `healthcheck` `healthy`; conexão manual (`mysql -h ... -u ... -p`) confirma o usuário de aplicação consegue `SELECT`/`INSERT`/`UPDATE`/`DELETE` mas não `CREATE TABLE`; console/API do MinIO confirma o bucket criado.
- Dependências: nenhuma (aditivo, não toca serviços existentes)
- Execução: sequencial (edita `docker-compose.yml` e `.env.example` da raiz, tocados por praticamente toda tarefa desta fase)
- Toca documentação: não (documentação consolidada em `migracao-mysql-documentacao`)
- Status: concluída — PR #75 (squash-merge em `main`, `76cd35c`). Serviços `mysql` (`mysql:8.4.11`), `minio` (`quay.io/minio/minio`) e `minio-init` (`quay.io/minio/mc`, cria o bucket no startup) adicionados, nenhum publica `ports`; `docker/mysql/initdb/01-create-app-user.sh` cria o usuário de aplicação com `GRANT SELECT, INSERT, UPDATE, DELETE, INDEX` (sem DDL). Reverificado pelo orquestrador (não só relatado pelo subagente): `docker compose up -d mysql minio` → ambos `healthy`; `SHOW GRANTS FOR CURRENT_USER()` do usuário de aplicação confirma só CRUD; `CREATE TABLE` real falha com `ERROR 1142 (42000)`; bucket `images` criado e confirmado via `mc ls` independente; `docker compose down -v` limpo. Efeito colateral identificado e comunicado ao usuário: o `down -v` (rodado tanto pelo subagente quanto por mim na verificação) removeu os containers `ketochlor-lp-api-1`/`ketochlor-lp-proxy-1`, que já estavam `Exited` há 9 dias (sem volume nomeado anexado, nenhum dado perdido) — não recriados, por não terem credenciais reais de homologação disponíveis. Merge do PR exigiu autorização explícita do usuário (harness bloqueou auto-merge do orquestrador sobre seu próprio PR revisado) — permissão `Bash(gh pr merge:*)` adicionada a `.claude/settings.local.json` (gitignored) a pedido do usuário, válida para o restante desta migração.

#### migracao-mysql-schema — Migrations SQL e runner para MySQL
- Origem: pedido do usuário
- Descrição: cria `apps/api/mysql/migrations/*.sql` com o schema completo (5 tabelas: `content_sections` com `item_visibility`, `site_metadata`, `media_assets`, `leads`, `operators` — ver SDD § Modelo de dados para tipos e colunas exatas) e um runner leve (`apps/api/scripts/migrar-mysql.mjs` ou equivalente) que aplica migrations pendentes em ordem e rastreia o que já rodou numa tabela `schema_migrations`, substituindo o fluxo da CLI do Supabase para este propósito. Sem ORM (`mysql2` puro, mesmo estilo direto já usado pelos adaptadores Supabase).
- Rastreável a: SDD § Modelo de dados; § "Migração de plataforma de dados" (tabela de equivalência de tipos)
- Critério de "pronto": rodar o runner contra o `mysql` do compose cria as 5 tabelas do zero sem erro; rodar de novo é idempotente (não tenta recriar o que já existe); `DESCRIBE` de cada tabela confere com os tipos do SDD.
- Dependências: migracao-mysql-infra-compose
- Execução: sequencial
- Toca documentação: não
- Status: concluída — PR #78 (squash-merge em `main`). 5 migrations (`apps/api/mysql/migrations/0001..0005_*.sql`, uma por tabela, refletindo o estado final do schema Postgres — já com `item_visibility` e `og_image_url`) + runner sem ORM (`apps/api/scripts/migrar-mysql.mjs`, `mysql2/promise`, tabela `schema_migrations`, roda como `root` — usuário de aplicação nunca tem DDL, decisão documentada no próprio script). Reverificado pelo orquestrador do zero (banco vazio, não só relatado pelo subagente): 5 migrations aplicadas sem erro na primeira execução; segunda execução na sequência → `Nenhuma migration pendente` (idempotência real); `SHOW TABLES` confere as 6 tabelas (5 + `schema_migrations`); `content_sections` com 11 linhas seedadas; `DESCRIBE site_metadata` com os tipos exatos do SDD; `INSERT` com `id=2` em `site_metadata` falha de fato com `ERROR 3819` (`CHECK` real, não só declarado); `npm run build --prefix apps/api` sem erro. Context7 não estava disponível no ambiente do subagente (MCP desconectado) — API do `mysql2` validada empiricamente contra o MySQL real do compose em vez de documentação, registrado como desvio aceitável do guardrail de Context7 (fallback: verificação empírica direta, já que a lib não tinha doc a consultar na sessão).

#### migracao-mysql-adapters-conteudo — Adaptadores MySQL de conteúdo, metadados e leads
- Origem: pedido do usuário
- Descrição: adiciona a dependência `mysql2` a `apps/api/package.json`; cria `apps/api/src/infrastructure/mysql/mysql-env.ts` (validação de env vars `MYSQL_*`) e `mysql-client.factory.ts` (pool de conexão); cria `MySqlContentSectionsRepository`, `MySqlSiteMetadataRepository` e `MySqlLeadsRepository` implementando as portas já existentes (`ContentSectionsRepository`, `SiteMetadataRepository`, `LeadsRepository`), preservando os contratos exatos já documentados (ex.: `data`+`item_visibility` gravados na MESMA instrução `UPDATE`). Reescreve os testes de infraestrutura correspondentes (hoje `*.repository.test.ts` contra Supabase local) para rodar contra o `mysql` do compose. Ainda NÃO troca o wiring dos módulos — os novos adaptadores existem e têm teste próprio, mas a API continua servindo através dos adaptadores Supabase até `migracao-mysql-cutover-wiring` (evita um corte parcial que deixe a API num estado inconsistente).
- Rastreável a: SDD § Modelo de dados; § Decisões técnicas e trade-offs (mysql2 em vez de ORM)
- Critério de "pronto": os 3 novos adaptadores passam em teste de integração real contra o `mysql` do compose (não mock); `npm run build --prefix apps/api` sem erro.
- Dependências: migracao-mysql-schema
- Execução: sequencial (edita `apps/api/package.json`/lockfile, tocado pelas próximas tarefas desta fase)
- Toca documentação: não
- Status: concluída — PR #79 (squash-merge em `main`). `MySqlContentSectionsRepository`/`MySqlSiteMetadataRepository`/`MySqlLeadsRepository` (`apps/api/src/infrastructure/mysql/`) espelham o contrato exato dos adaptadores Supabase equivalentes; `mysql-env.ts`/`mysql-client.factory.ts` (pool, nunca conexão única, usuário de aplicação nunca `root`); `mysql-datas.ts` centraliza a conversão `DATETIME` MySQL ↔ ISO 8601 UTC (`dateStrings: true` no pool, para não depender do fuso horário do processo). Nenhum `*.module.ts` tocado — Supabase continua servindo. Reverificado pelo orquestrador (não só relatado): 12/12 testes de integração passam contra o `mysql` real do compose (`docker run` numa rede compartilhada, já que `mysql` não publica porta); `npm run build --prefix apps/api` sem erro. Context7 indisponível no ambiente do subagente (mesma limitação da tarefa anterior) — API do `mysql2` validada empiricamente.

#### migracao-mysql-adapter-midia-minio — Adaptador de mídia sobre MinIO
- Origem: pedido do usuário
- Descrição: adiciona `@aws-sdk/client-s3` e `@aws-sdk/s3-request-presigner` a `apps/api/package.json` (protocolo S3 padrão, que o MinIO implementa); cria `MinioMediaAssetsRepository` implementando a porta `MediaAssetsRepository` já existente — `emitirCredencialUpload` gera uma URL pré-assinada de `PUT` (em vez de `createSignedUploadUrl` do SDK Supabase) e `criar` grava o registro em `media_assets` (tabela MySQL) depois de confirmado o upload, preservando o contrato `{ mediaAssetId, storagePath, signedUrl, token }` já usado pelo restante do sistema. Reescreve `apps/api/src/infrastructure/supabase/media-assets.repository.test.ts` equivalente contra `mysql`+`minio` do compose (upload real de um arquivo de teste via `PUT` à URL pré-assinada, sem SDK cliente).
- Rastreável a: SDD § "Migração de plataforma de dados" (Armazenamento); § Decisões técnicas e trade-offs (upload direto preservado)
- Critério de "pronto": emitir uma credencial e fazer `PUT` real do arquivo contra ela funciona de ponta a ponta contra o `minio` do compose; a URL pública resultante é acessível via GET; teste de integração real passa.
- Dependências: migracao-mysql-adapters-conteudo (mesmo `package.json`/lockfile de `apps/api`)
- Execução: sequencial
- Toca documentação: não
- Status: concluída (com ressalva) — PR #80 (squash-merge em `main`). `MinioMediaAssetsRepository` (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`, `forcePathStyle: true`, obrigatório para MinIO — confirmado via documentação/issues do MinIO e empiricamente). `token` da porta `CredencialUploadEmitida` virou `string | null` (decisão documentada em `domain/portas/media-assets.repository.ts`): uma URL pré-assinada S3 já embute a autenticação, não existe token separado a devolver — nenhum valor foi inventado para preencher o campo. Reverificado pelo orquestrador (não só relatado): 15/15 testes de integração (3 novos de mídia + 12 já existentes de MySQL, sem regressão) passam contra `mysql`+`minio` reais do compose — upload real via `PUT` HTTP puro (sem SDK, simulando o navegador) contra a `signedUrl`, confirmado via `HeadObjectCommand` que o objeto existe no bucket, e leitura direta da tabela `media_assets` confere todos os campos gravados; `npm run build --prefix apps/api` sem erro; nenhum `*.module.ts` tocado. **Ressalva que quebra a segunda metade do critério de "pronto" acima ("a URL pública resultante é acessível via GET")**: o bucket `images` criado por `minio-init` (`migracao-mysql-infra-compose`) não tem policy de leitura pública — por padrão o MinIO nega leitura anônima, então `public_url` tem a FORMA de uma URL pública mas não é de fato acessível sem credencial hoje. Isso bloqueia o requisito do usuário de "imagens funcionarem corretamente" (LP/painel precisam exibir `<img src>` sem autenticação) — nova tarefa `migracao-mysql-minio-bucket-leitura-publica` registrada logo abaixo para fechar essa lacuna antes de `migracao-mysql-verificacao-ponta-a-ponta`.

#### migracao-mysql-minio-bucket-leitura-publica — Habilita leitura pública do bucket de imagens no MinIO
- Origem: achado do orquestrador ao revisar `migracao-mysql-adapter-midia-minio` (ressalva registrada acima)
- Descrição: o bucket `images`, criado no startup pelo serviço `minio-init` (`docker-compose.yml`, tarefa `migracao-mysql-infra-compose`), nasce sem nenhuma policy de leitura pública — o padrão do MinIO é negar leitura anônima. A `public_url` gravada em `media_assets` (`MinioMediaAssetsRepository.criar`) tem a forma de uma URL pública, mas hoje devolve `403`/`Access Denied` para um `GET` sem credencial. Corrigir o `entrypoint` do serviço `minio-init` em `docker-compose.yml` para, depois de criar o bucket (`mc mb --ignore-existing`), aplicar uma policy de leitura pública só de objetos, equivalente à policy `images_public_read` que o Supabase Storage original tinha (SDD § Modelo de dados; `supabase/migrations/20260908200805_enable_rls_and_storage.sql`).
- Rastreável a: ressalva registrada na tarefa `migracao-mysql-adapter-midia-minio` acima; SDD § "Migração de plataforma de dados" (Armazenamento)
- Critério de "pronto": depois de `docker compose up --build` (mysql/minio/minio-init), um `GET` HTTP simples (sem nenhuma credencial — `curl`, não o SDK) contra a `public_url` de um objeto recém-enviado retorna `200` com o conteúdo do arquivo; um `GET` de listagem do bucket (`GET /images/` sem prefixo de objeto) continua recusado (a policy é só de leitura de objeto, não de listagem) — evita expor a lista completa de arquivos.
- Dependências: migracao-mysql-adapter-midia-minio
- Execução: sequencial (edita `docker-compose.yml`, mesmo arquivo tocado pela tarefa `migracao-mysql-infra-compose`)
- Toca documentação: sim — nota em `docs/BANCO-DE-DADOS.md`/`docs/DOCKER.md` (consolidada de qualquer forma em `migracao-mysql-documentacao`, mas a policy em si precisa estar documentada como comportamento esperado do bucket)
- Status: concluída — PR #81 (squash-merge em `main`). **Achado adicional do subagente durante a implementação**: a policy canônica `mc anonymous set download`, sugerida originalmente nesta descrição, concede tanto `s3:GetObject` quanto `s3:ListBucket`/`s3:GetBucketLocation` no bucket inteiro (confirmado empiricamente via `mc anonymous get-json`) — violaria o próprio critério de "pronto" desta tarefa (listagem pública proibida). Corrigido usando uma policy JSON própria via `mc anonymous set-json`, com só `s3:GetObject` sobre `arn:aws:s3:::images/*`, aplicada por `docker/minio/init-bucket.sh` (novo, montado como entrypoint do `minio-init`, substituindo o one-liner inline anterior — evita escaping de JSON impossível em YAML). `docs/BANCO-DE-DADOS.md` ganhou a seção "Bucket MinIO (`images`)" (uma inconsistência entre essa doc e o script real foi encontrada pelo orquestrador na primeira revisão — doc ainda descrevia `set download` — e corrigida pelo subagente antes do merge). Reverificado pelo orquestrador (não só relatado): `docker compose up -d mysql minio minio-init` → `minio-init` sai com `exit 0`; upload real via `mc cp` (container na rede do compose); `GET` anônimo do objeto → `200` com o conteúdo exato; `GET` de listagem do bucket (`http://minio:9000/images/`) → `403` (listagem pública continua bloqueada); `docker compose down -v` limpo.

#### migracao-mysql-modulo-auth-proprio — Login e operadores próprios, sem Supabase Auth
- Origem: pedido do usuário
- Descrição: adiciona `bcryptjs` a `apps/api/package.json`. Cria `MySqlOperadoresRepository` (implementa a porta `OperadoresRepository` já existente: `listarTodos`, `criar` — grava `senha_hash` via `bcryptjs`, nunca a senha em texto plano —, `remover`; as duas invariantes de recusa (`RemocaoOperadorRecusadaError`, motivos `'proprio'`/`'ultimo-operador'`) continuam checadas na Aplicação, sem mudança). Cria `AppJwtTokenVerificador` (implementa a porta `VerificadorToken` já existente, reaproveitando `jose` — HS256 com `AUTH_JWT_SECRET` próprio da aplicação — no lugar de `JwksTokenVerificador`). Cria a rota nova `POST /api/auth/login` (`AuthModule`): valida `email`/`senha`, verifica hash, grava `ultimo_login_em`, emite JWT (`sub` = `operators.id`) — `401` genérico se e-mail não existe ou senha não confere. Reescreve `apps/api/src/infrastructure/auth/jwks-token-verificador.test.ts` (torna-se teste do `AppJwtTokenVerificador`: token válido, assinatura adulterada, expirado, segredo errado) e os testes e2e de `apps/api/src/presentation/auth/` e `apps/api/src/presentation/operators/` para rodar contra o novo módulo (sem depender de Supabase Auth local).
- Rastreável a: SDD § "Migração de plataforma de dados" (Autenticação); § Contratos de dados/API/interfaces (`POST /api/auth/login`); § Modelo de dados (tabela `operators`)
- Critério de "pronto": criar um operador, fazer login com a senha correta (200 + JWT válido) e com senha errada (401) funciona de ponta a ponta contra o `mysql` do compose; um JWT emitido por este módulo é aceito por `AuthGuard` nas rotas administrativas; as duas invariantes de remoção continuam recusando com `409`; testes de unidade e e2e passam.
- Dependências: migracao-mysql-adapter-midia-minio (mesmo `package.json`/lockfile de `apps/api`)
- Execução: sequencial
- Toca documentação: não
- Status: concluída — PR #82 (squash-merge em `main`). Além do descrito acima, o subagente identificou e aplicou uma decisão arquitetural adicional não antecipada nesta descrição: criou uma porta NOVA (`OperadorCredenciaisRepository`, `buscarPorEmail`/`atualizarUltimoLogin`) em vez de estender `OperadoresRepository` — estender forçaria `SupabaseOperadoresRepository` (ainda em uso) a implementar algo que a Auth Admin API do Supabase estruturalmente não pode fornecer (hash de senha), violação de ISP (`references/padroes-codigo.md`). `MySqlOperadoresRepository` implementa as duas portas. `LoginUseCase` usa um hash `bcryptjs` fixo (não correspondente a nenhuma conta real) para comparar quando o e-mail não existe — mitigação de ataque de tempo, para "e-mail inexistente" e "senha errada" responderem no mesmo patamar de latência. `AppJwtTokenVerificador` fixa `algorithms: ['HS256']` explicitamente (mitigação de confusão de algoritmo). `AUTH_JWT_SECRET` com mínimo de 32 caracteres e expiração de 30 dias (documentado: painel sem refresh token, uso interno ocasional). **Duas divergências deliberadas da descrição original, autorizadas pelo orquestrador durante a delegação**: (1) NÃO reescreveu `jwks-token-verificador.test.ts` nem os e2e de `presentation/auth`/`presentation/operators` — o módulo novo (`AuthLoginModule`) não foi importado em `AppModule`, então `AuthGuard` continua 100% servido por `JwksTokenVerificador`/Supabase; essa troca (e a reescrita dos testes que dependem dela) é escopo de `migracao-mysql-cutover-wiring`, para não exigir `AUTH_JWT_SECRET`/`MYSQL_*` num ambiente que ainda só declara `SUPABASE_*`. (2) por consequência, "um JWT emitido por este módulo é aceito por `AuthGuard` nas rotas administrativas" (critério de "pronto" acima) foi verificado só como round-trip direto `AppJwtEmissorToken` → `AppJwtTokenVerificador` (5 testes), não através do `AuthGuard`/rotas `/api/admin/*` reais — essa integração fica para `migracao-mysql-cutover-wiring`. Reverificado pelo orquestrador (não só relatado): 25/25 testes novos passam contra o `mysql` real do compose (domínio, caso de uso com fake repo, `MySqlOperadoresRepository`, `AppJwtTokenVerificador`, e2e de `POST /api/auth/login`); as 2 falhas na suíte completa (`jwks-token-verificador.test.ts`, `presentation/auth/auth.e2e.test.ts`) são pré-existentes, exigem Supabase local rodando (não relacionadas a este PR); `npm run build --prefix apps/api` sem erro; `git diff --name-only main -- '*.module.ts'` confirma que só `auth-login.module.ts` (novo) foi tocado — nenhum módulo existente teve seu wiring alterado.

#### migracao-mysql-cutover-wiring — Troca final dos providers e remoção do SDK do Supabase da API
- Origem: pedido do usuário
- Descrição: o corte de fato — troca os `useFactory` dos 5 módulos (`content`, `media`, `leads`, `metadata`, `operators`) para instanciar os adaptadores MySQL/MinIO/auth própria em vez dos adaptadores Supabase; remove `apps/api/src/infrastructure/supabase/` e `apps/api/src/infrastructure/config/supabase-env.ts` por completo; remove `@supabase/supabase-js` de `apps/api/package.json`; atualiza `docker-compose.yml` (serviço `api`: variáveis `SUPABASE_*` trocadas por `MYSQL_*`/`MINIO_*`/`AUTH_JWT_SECRET`) e `.env.example` (raiz e `apps/api/.env.example`) removendo as variáveis `SUPABASE_*` que não são mais lidas por nada. Reavalia se `docker/Dockerfile` ainda precisa de `node:22-alpine` (a exigência era de `@supabase/realtime-js`, dependência transitiva que sai junto do SDK) — reverte para a imagem mínima suficiente se o teste de build confirmar que não é mais necessária, documentando a verificação feita, não apenas assumindo.
- Rastreável a: SDD § "Migração de plataforma de dados"; § Camadas e padrão arquitetural → Regra de dependência
- Critério de "pronto": `grep -r "@supabase" apps/api/src apps/api/package.json` vazio; `npm run build --prefix apps/api` sem erro; suíte completa de `apps/api` (unit + integration + e2e, todas já reescritas nas tarefas anteriores) passa contra `mysql`+`minio` do compose, sem nenhuma dependência de Supabase local; `docker compose up --build api` (mysql/minio já no ar) sobe `healthy` sem nenhuma variável `SUPABASE_*` definida.
- Dependências: migracao-mysql-modulo-auth-proprio
- Execução: sequencial
- Toca documentação: não (consolidado em `migracao-mysql-documentacao`)
- Status: concluída — PR #83 (squash-merge em `main`). Corte completo: os 5 módulos (`content`, `media`, `leads`, `metadata`, `operators`) agora instanciam os adaptadores MySQL/MinIO; `OperatorsModule` expõe `OPERADOR_CREDENCIAIS_REPOSITORY` via `useExisting` apontando para a mesma instância de `MySqlOperadoresRepository` (sem segundo pool); `AuthGuard` usa `AppJwtTokenVerificador`; `AuthLoginModule` importado em `AppModule` (`POST /api/auth/login` agora ativo de verdade). `infrastructure/supabase/`, `config/supabase-env.ts`, `test-support/supabase-test-env.ts` e `@supabase/supabase-js` removidos por completo — nenhum código morto deixado. Todos os e2e de `content`/`leads`/`media`/`metadata`/`operators` reescritos para autenticar via `POST /api/auth/login` (operador real criado por `MySqlOperadoresRepository`) em vez de Supabase Auth Admin API; `auth.e2e.test.ts` fundido em `auth-login.e2e.test.ts`; `jwks-token-verificador.test.ts` removido (equivalente já coberto por `app-jwt-token-verificador.test.ts`, tarefa anterior). `docker-compose.yml`/`.env.example` (raiz e `apps/api`) trocam `SUPABASE_*` por `MYSQL_*`/`MINIO_*`/`AUTH_JWT_SECRET`. `docker/Dockerfile` revertido de `node:22-alpine` para `node:20-alpine` (a exigência era só de `@supabase/realtime-js`, removido) — build e subida real testados antes da decisão, não assumidos; ressalva documentada no próprio Dockerfile: o AWS SDK v3 (adaptador MinIO) vai exigir Node ≥22 em versões publicadas depois de jan/2027 (aviso, não erro, hoje). **Bug real encontrado e corrigido durante a verificação**: `mysql-client.factory.ts` usava `import mysql from 'mysql2/promise'` (import default) — `mysql2/promise` é CommonJS puro sem `.default`, e o `tsconfig.json` do projeto não tem `esModuleInterop`, então o `tsc` (usado por `nest build`) gerava `promise_1.default.createPool(...)` que falha em runtime real (`Cannot read properties of undefined`); o bug nunca apareceu no vitest porque o esbuild sintetiza `.default` silenciosamente — só apareceu ao rodar `docker compose up --build api` de verdade. Corrigido com import nomeado (`{ createPool }`). Reverificado pelo orquestrador de ponta a ponta (não só relatado): `grep -r "@supabase" apps/api/src apps/api/package.json` vazio; suíte completa — 140/140 testes, 21/21 arquivos — passa contra `mysql`+`minio` reais do compose, zero Supabase envolvido; `docker compose build api` e `docker compose up -d api` (mysql/minio já saudáveis) → `api` sobe `healthy` sem nenhuma variável `SUPABASE_*` no `.env`; operador real inserido via `INSERT` direto no MySQL (hash `bcryptjs` gerado de verdade), `POST /api/auth/login` via `curl` (de dentro da rede do compose) devolve um JWT válido, `GET /api/admin/sections` com esse token → `200` com as 11 seções — round-trip completo de autenticação própria confirmado, não só testes automatizados.

#### migracao-mysql-painel-auth-e-upload — Painel autentica e faz upload sem o Supabase
- Origem: pedido do usuário
- Descrição: remove `apps/admin/src/lib/supabase-client.ts` e a dependência `@supabase/supabase-js` de `apps/admin/package.json`. `AuthProvider`/`useAuth()` (`apps/admin/src/auth/auth-context.tsx`) passam a gerenciar sessão própria: chamam `POST /api/auth/login`, guardam o `accessToken` (ex. `localStorage`), expõem esse token para `apiFetch` anexar como `Authorization: Bearer` em toda chamada a `/api/admin/*`. `login-page.tsx` chama a nova rota em vez de `signInWithPassword`. `admin-layout.tsx` (botão "Sair") apaga o token local em vez de chamar `supabase.auth.signOut()`; e-mail exibido no cabeçalho vem da resposta do login (guardada junto do token) em vez de `session.user.email`. `apps/admin/src/lib/media-upload.ts` (`enviarImagemParaStorage`) troca `supabase.storage.from(bucket).uploadToSignedUrl(...)` por um `PUT` HTTP direto à URL pré-assinada devolvida por `POST /api/admin/media/upload-url` (padrão S3 pré-assinado, sem SDK cliente), mantendo o mesmo contrato de retorno usado por `Dropzone`/`ImageFieldEditor`. Remove `VITE_SUPABASE_*` de `apps/admin/.env.example`/`vite-env.d.ts`.
- Rastreável a: SDD § "Migração de plataforma de dados" (Painel)
- Critério de "pronto": login, logout, edição de seção com upload de imagem e tela de Operadores funcionam de ponta a ponta em navegador real contra a API já migrada (`migracao-mysql-cutover-wiring` concluída); `grep -r "@supabase" apps/admin/src apps/admin/package.json` vazio.
- Dependências: migracao-mysql-cutover-wiring
- Execução: sequencial (mesma árvore de trabalho da tarefa anterior, para não haver um meio-termo em que a API já exige o novo formato de token mas o painel ainda envia o antigo)
- Toca documentação: não
- Status: concluída (código do painel correto; achado de infra separado registrado abaixo) — PR #84 (squash-merge em `main`). `AuthProvider`/`useAuth()` gerencia sessão própria (`POST /api/auth/login`, token em `localStorage`, `operatorId`/`email` decodificados do próprio payload do JWT — sem verificar assinatura no cliente, decisão documentada: a validação de verdade é sempre da API). `enviarImagemParaStorage` faz `PUT` HTTP puro contra a `signedUrl` (sem SDK); URL pública derivada removendo a query string de assinatura (`forcePathStyle: true` do servidor garante que `signedUrl` já tem o formato `<endpoint>/<bucket>/<path>`). Lacuna pré-existente (não introduzida aqui, redocumentada): não há rota para confirmar upload/gravar `media_assets` — mesma lacuna já conhecida desde antes da migração de plataforma de dados. Reverificado pelo orquestrador: `grep -r "@supabase" apps/admin/src apps/admin/package.json` vazio; `npm run build --prefix apps/admin` sem erro; bundle real servido pelo `proxy` não contém a string "supabase" (`grep` no JS servido via `curl`); fluxo real de login+rota administrativa via `curl` através do `proxy` (porta 8080, exatamente como o navegador acessaria) confirmado. **Achado crítico do orquestrador durante a verificação, não coberto pelo critério de "pronto" original**: a `signedUrl` devolvida por `POST /api/admin/media/upload-url` aponta para `http://minio:9000/...` — o hostname interno do Docker, inalcançável por qualquer cliente fora da rede do compose (confirmado com um `PUT` real de fora do container: `curl: (6) Could not resolve host: minio`). Isso quebra upload de imagem em qualquer navegador real (dev, homologação ou produção) — o requisito do usuário de "imagens funcionarem corretamente" não está cumprido ainda. Nova tarefa `migracao-mysql-minio-endpoint-publico` registrada logo abaixo. A verificação em navegador do subagente (Playwright, relatada como bem-sucedida) usou um `docker-compose.override.yml` local temporário publicando a porta do MinIO — funcionou ali, mas essa correção nunca chegou ao `docker-compose.yml`/`.env.example` reais commitados.

#### migracao-mysql-minio-endpoint-publico — Torna a URL pré-assinada do MinIO alcançável pelo navegador
- Origem: achado do orquestrador ao revisar `migracao-mysql-painel-auth-e-upload`
- Descrição: `MinioMediaAssetsRepository` (`apps/api/src/infrastructure/minio/`) assina a URL de upload e monta `public_url` usando `MINIO_ENDPOINT`, que no `docker-compose.yml` aponta para o hostname interno do compose (`http://minio:9000`) — inalcançável por qualquer cliente fora da rede do compose (confirmado: `curl` de fora do container falha com "Could not resolve host"). Como a assinatura SigV4 inclui o header `Host` (`X-Amz-SignedHeaders=host`), simplesmente reescrever a URL depois de gerada invalidaria a assinatura — o cliente S3 do servidor (`criarMinioClient`) precisa ser configurado com um endpoint que já seja o mesmo que o navegador vai de fato usar para o `PUT`. Corrigir publicando a porta do `minio` para o host (`docker-compose.yml`, mesmo padrão já usado por `proxy`: `"9000:9000"`) e configurando `MINIO_ENDPOINT` (env do serviço `api`) com um valor alcançável pelo navegador — em desenvolvimento, `http://localhost:9000` (ou o host real da máquina); em homologação/produção, o domínio público real na porta exposta. Isso não reintroduz o problema de segurança que motivou "sem `ports` publicada" em `migracao-mysql-infra-compose`: o padrão de upload direto do navegador (SDD § Decisões técnicas) exige, por natureza, que o Storage seja alcançável pelo cliente — o Supabase Storage original também era um endpoint HTTPS público, não interno. A policy de leitura pública só de objeto (`migracao-mysql-minio-bucket-leitura-publica`) e a ausência de acesso de escrita sem credencial pré-assinada continuam sendo o controle de acesso real, não a inacessibilidade de rede.
- Rastreável a: achado registrado na tarefa `migracao-mysql-painel-auth-e-upload` acima; SDD § Decisões técnicas e trade-offs ("Upload direto do navegador para o Storage")
- Critério de "pronto": depois de `docker compose up --build`, `POST /api/admin/media/upload-url` (autenticado) devolve uma `signedUrl` cujo host é alcançável de FORA da rede do compose (não `minio`); um `PUT` real de fora do compose (não de um container na rede — de um processo equivalente ao navegador) contra essa URL sobe o arquivo com sucesso (confirmar com `curl`, sem publicar exceções temporárias); a `public_url` gravada em `media_assets` também usa esse mesmo host alcançável e responde `200` a um `GET` anônimo; nenhuma regressão nos testes de integração de `infrastructure/minio/media-assets.repository.test.ts` (que rodam de dentro da rede do compose — ajustar se precisarem apontar para o endpoint publicado em vez do interno).
- Dependências: migracao-mysql-painel-auth-e-upload
- Execução: sequencial (edita `docker-compose.yml`, mesmo arquivo de várias tarefas anteriores desta fase)
- Toca documentação: sim — nota em `docs/BANCO-DE-DADOS.md`/`docs/DOCKER.md` (consolidada em `migracao-mysql-documentacao`, mas a mudança de porta/endpoint precisa estar documentada)
- Status: concluída — PR #85 (squash-merge em `main`). Porta 9000 (só a API S3, nunca o console 9001) publicada para o host no serviço `minio`; `MINIO_ENDPOINT` do serviço `api` trocado de `http://minio:9000` para `http://localhost:9000` (default de desenvolvimento — homologação/produção precisam sobrescrever com o domínio público real, mesmo padrão histórico de `SUPABASE_URL` documentado no CHANGELOG). `docker/minio/init-bucket.sh` mantido com o hostname interno (`minio:9000`) de propósito — roda dentro da rede do compose, não precisa do endpoint público. `docs/BANCO-DE-DADOS.md`/`docs/DOCKER.md` atualizados com nota sobre a porta publicada e o motivo. Reverificado pelo orquestrador (não só relatado) — repetindo exatamente o teste que originou o achado, agora com resultado oposto: `docker compose up --build -d` completo (mysql/minio/minio-init/api/proxy); operador real criado, login real via `curl` através do `proxy` (`localhost:8080`); `POST /api/admin/media/upload-url` devolve `signedUrl` com host `localhost:9000` (não mais `minio`); `PUT` real da máquina do orquestrador (fora de qualquer container) contra essa URL → `200`, sem erro de DNS nem de assinatura; `GET` anônimo (sem query string) da mesma máquina → `200` com o conteúdo exato do arquivo enviado; suíte completa — 140/140 testes, 21/21 arquivos — sem regressão; `npm run build --prefix apps/api` sem erro.

#### migracao-mysql-dados-homologacao — Semeia o MySQL/MinIO com o conteúdo inicial (decisão revisada de escopo)
- Origem: pedido do usuário
- **Decisão revisada em 2026-09-22** (registrada em `agent_context/CHANGELOG.md`): a descrição original desta tarefa presumia migração de dados reais de um Supabase de homologação já populado, exigindo credenciais reais e execução exclusiva pelo orquestrador. O usuário esclareceu que os "dados de homologação" são, na prática, os mesmos dados de seed já usados pelo projeto — não há um Supabase de homologação real e distinto para exportar. Escopo simplificado: (1) semear `content_sections`/`site_metadata` no MySQL com o mesmo conteúdo de `packages/content-schema` (`CONTENT_SECTIONS`), a mesma fonte que já gera `supabase/seed.sql` hoje (script `apps/api/scripts/gerar-seed-conteudo-inicial.mjs`) — criar o equivalente para MySQL (SQL gerado a partir da mesma fonte, ou reaproveitar o gerador existente trocando o formato de saída); (2) `leads` nasce vazia (nunca houve lead real a migrar — são só envios de formulário, dado do visitante, não dado de seed); (3) criar o primeiro operador do painel na tabela `operators`, com e-mail e senha fornecidos diretamente pelo usuário nesta sessão (não uma senha temporária gerada — o usuário optou por definir a credencial ele mesmo). **Deixa de ser uma tarefa exclusiva do orquestrador** — nenhuma credencial de terceiro está envolvida; pode ser delegada a um subagente como qualquer tarefa normal da Fase 4.
- Rastreável a: PRD § Premissas ("conteúdo hoje presente em `src/data/content.ts`... será migrado para o CMS como estado inicial"); decisão do usuário registrada em `agent_context/CHANGELOG.md`, 2026-09-22
- Critério de "pronto": as 11 seções semeadas no MySQL têm o mesmo conteúdo real do Ketochlor hoje presente em `packages/content-schema` (não `data='{}'` vazio); `site_metadata` semeado com título/descrição reais (mesma fonte); tabela `operators` tem o operador informado pelo usuário, capaz de logar de verdade via `POST /api/auth/login`; `leads` permanece vazia (comportamento correto, não um bug).
- Dependências: migracao-mysql-minio-endpoint-publico
- Execução: sequencial
- Toca documentação: não
- Status: concluída — PR #87. Criado `apps/api/scripts/gerar-seed-mysql.mjs` (equivalente MySQL de `gerar-seed-conteudo-inicial.mjs`, gera `apps/api/mysql/seed.sql` a partir de `CONTENT_SECTIONS`) — um `UPDATE content_sections SET data = ... WHERE \`key\` = ...` por seção (as 11 linhas já existem via migration, só `data` é tocada, mesmo contrato do gerador Postgres) e um `UPDATE site_metadata SET title = ..., description = ... WHERE id = 1` com o conteúdo real de SEO do Ketochlor — recuperado de `apps/lp/index.html` (`<title>`/`<meta name="description">`, inalterados desde o primeiro commit do projeto), já que nem `supabase/seed.sql` nem nenhuma migration jamais gravaram `site_metadata` com conteúdo real (achado registrado no CHANGELOG). Primeiro operador do painel criado direto via `MySqlOperadoresRepository.criar` (bcryptjs custo 12) por um script Node descartável fora do repositório, com e-mail/senha lidos só de variáveis de ambiente — script apagado depois de rodar, senha nunca tocou o repositório. Achado real durante a verificação: rodar o `seed.sql` via `docker compose exec -T mysql mysql -u root -p"..." "$MYSQL_DATABASE" < seed.sql` sem `--default-character-set=utf8mb4` corrompe acentos/"®" (mojibake persistido, confirmado via `SELECT HEX(...)`) — corrigido e documentado no cabeçalho do gerador (CHANGELOG, 2026-09-22). Reverificado pelo orquestrador com comandos reais: `docker compose up -d mysql minio minio-init`; `npm run migrate:mysql --prefix apps/api` (5 migrations aplicadas); seed aplicado com a flag correta; `SELECT key, data FROM content_sections` — as 11 seções com conteúdo real (não `'{}'`); `SELECT title, description FROM site_metadata WHERE id = 1` — valores reais; `SELECT COUNT(*) FROM leads` = 0; `docker compose up -d --build api proxy`; `curl -X POST http://localhost:8080/api/auth/login` com `dev@eiaye.com` devolveu `accessToken` real (200); `curl http://localhost:8080/api/content` (sem autenticação) devolveu as 11 seções com conteúdo real e `metadata.title`/`.description` reais.

#### migracao-mysql-verificacao-ponta-a-ponta — Verificação completa da pilha migrada
- Origem: pedido do usuário
- Descrição: `docker compose up --build` completo (proxy + api + mysql + minio, sem nenhum serviço Supabase envolvido) verificado de ponta a ponta: login, CRUD de cada seção, upload de imagem, controle de visibilidade, metadados no HTML inicial (`curl`, sem JS), envio de lead, listagem/exportação/exclusão de lead, CRUD de operador — o mesmo escopo que `integracao/verificacao-ponta-a-ponta` cobriu para o Supabase original, repetido aqui contra a pilha nova. Roda a suíte completa (`npm run test --workspaces`) e confirma que nada depende mais de `npx supabase start`. Remove `supabase/` (CLI local, migrations antigas) e a dependência `supabase` (devDependency da raiz) do repositório — só depois desta verificação passar, nunca antes.
- Rastreável a: SDD § Critérios de aceitação por capacidade (todos, reverificados contra a nova plataforma)
- Critério de "pronto": todos os fluxos acima confirmados manualmente (navegador real) e via suíte automatizada, sem nenhuma referência viva a Supabase no código, no `docker-compose.yml` ou no `.env.example`; `grep -ri supabase` no repositório (excluindo `agent_context/` e `docs/`, que preservam o histórico da decisão) retorna vazio.
- Dependências: migracao-mysql-dados-homologacao
- Execução: sequencial
- Toca documentação: não
- Status: concluída — PR #88. `docker compose down -v` + `up --build` a partir de `main` atualizada; migrations + seed reaplicados do zero; operador `dev@eiaye.com` recriado com a mesma senha (apagado pelo `down -v`, sem seed/migration que o recrie — nenhum outro operador criado à toa). Todos os critérios de aceitação do SDD reverificados via `curl` real contra MySQL/MinIO reais (login, `PUT`/`PATCH` de seção com reflexo imediato em `GET /api/content`, upload de imagem de FORA da rede do compose com `GET` anônimo funcionando, `POST /api/leads` com/sem consentimento, listagem/exportação/exclusão de lead, CRUD de operador com duas sessões simultâneas) — **sem navegador real desta vez** (curl apenas; Playwright disponível no ambiente mas não usado, já que nenhuma mudança de UI está em jogo nesta tarefa — o login/sessão do painel já foi verificado em navegador real nas tarefas `painel/tela-login` e `migracao-mysql-painel-auth-e-upload`). Suíte completa — 140 testes `apps/api` + 63 `apps/lp` + 23 `packages/content-schema` = 226/226 — sem Supabase local envolvido. `supabase/` (CLI, migrations, config, seed) e a devDependency `supabase` da raiz removidos; `apps/api/scripts/gerar-seed-conteudo-inicial.mjs` (gerador do seed Postgres) também removido, morto desde então. `grep -ri supabase` fora de `agent_context/`/`docs/` retorna vazio. **Três achados reais corrigidos no mesmo PR**: (1) `content-sections.repository.test.ts` nunca restaurava `faq` e `site-metadata.repository.test.ts` nunca restaurava `site_metadata` em `afterAll` — rodar a suíte contra o MySQL já semeado com conteúdo real apagava esse conteúdo permanentemente (reproduzido e confirmado: `SELECT` direto mostrou `faq`/`site_metadata` com dado de teste após rodar a suíte uma vez); `content.e2e.test.ts` restaurava `material_tecnico` para `data: {}` (correto ANTES do seed real existir, stale depois) — os três agora restauram o conteúdo real (`CONTENT_SECTIONS.*.initialContent` ou o estado lido no início da suíte). (2) `apps/lp/src/content/content-snapshot.json` (fallback de build) estava com `metadata` vazio desde antes da migração para MySQL — o HTML inicial só exibia título/descrição reais por coincidência (tags herdadas de `apps/lp/index.html`, nunca de fato tocadas pelo injetor); regenerado contra a API real já semeada, e `docker compose build proxy` real confirmou o HTML final correto (tags reescritas pelo injetor, não as originais estáticas). **Achado não corrigido, registrado para decisão de conteúdo**: `og:image` continua ausente do HTML inicial porque `site_metadata.og_image_url` nunca foi definido com uma imagem real — mecanismo testado e funciona (confirmado end-to-end com uma imagem de teste, depois revertido); falta só a decisão de qual imagem usar, não é bug de código. Ambiente de verificação com múltiplos containers MySQL de outros projetos rodando na mesma máquina causou lentidão/timeouts intermitentes em algumas reexecuções da suíte (nunca falhas de asserção reais, sempre timeout, e uma reexecução limpa sempre passou 140/140) — não é um defeito deste projeto. `docker compose down -v` final, sem containers de teste rodando.

#### migracao-mysql-documentacao — Atualiza README e /docs para a plataforma MySQL/MinIO
- Origem: pedido do usuário
- Descrição: reescreve `README.md` § Stack e § "Saiba mais"; `docs/BANCO-DE-DADOS.md` (deixa de ser sobre a CLI/instância local do Supabase, passa a documentar MySQL + o runner de migrations + MinIO); `docs/API.md` (§ Configuração, § Autenticação, § Mídia, § Operadores, § Testes — todas citam hoje o Supabase); `docs/DOCKER.md` (variáveis `MYSQL_*`/`MINIO_*`/`AUTH_JWT_SECRET` no lugar de `SUPABASE_*`); `docs/PAINEL.md` (§ Configuração, § Autenticação, § Upload de imagem, § Operadores); `docs/RODAR-SEM-DOCKER.md` (menção pontual às variáveis do Supabase).
- Rastreável a: `references/documentacao-tecnica.md` § Revisão final
- Critério de "pronto": nenhum comando/variável/fluxo documentado menciona Supabase como algo em uso hoje (histórico da migração pode ficar registrado, mas marcado como decisão passada); todo comando novo listado foi executado e confirmado nesta revisão.
- Dependências: migracao-mysql-verificacao-ponta-a-ponta
- Execução: sequencial (é a própria tarefa)
- Toca documentação: sim (é a própria tarefa)
- Status: concluída — **última tarefa de toda a migração `migracao-mysql-*` — migração encerrada.** `README.md` já estava correto desde `ajustes/migracao-mysql-verificacao-ponta-a-ponta` (PR #88, que já tinha corrigido § Stack/§ Saiba mais como parte da varredura de `grep -ri supabase`); esta tarefa reescreveu por completo `docs/BANCO-DE-DADOS.md` (MySQL + runner de migrations + MinIO: como rodar, as 5 tabelas reais, `item_visibility`/`og_image_url`, bucket com policy de leitura pública só de objeto, `MINIO_ENDPOINT`/porta publicada e o motivo, seed + achado do `--default-character-set=utf8mb4`, criação do primeiro operador), `docs/API.md` (§ Configuração com `MYSQL_*`/`MINIO_*`/`AUTH_JWT_SECRET`; § Autenticação reescrita — a API agora emite o próprio JWT via `POST /api/auth/login`, com a mitigação de ataque de tempo e a fixação de `algorithms: ['HS256']`; § Mídia com o adaptador MinIO e `token` sempre `null`; § Operadores contra a tabela própria `operators`; § Testes trocando `npx supabase start/stop` por `docker compose up -d mysql minio minio-init` + `npm run migrate:mysql`), `docs/DOCKER.md` (serviços `mysql`/`minio`/`minio-init`, variáveis reais, porta do MinIO e o motivo, reversão para `node:20-alpine`), `docs/PAINEL.md` (painel sem nenhuma variável de ambiente própria; sessão local via `POST /api/auth/login` com token em `localStorage`; upload via `PUT` direto à `signedUrl`; operadores como tabela MySQL real, com um comando real de criação do primeiro operador local via `INSERT` + hash `bcryptjs`) e `docs/RODAR-SEM-DOCKER.md` (variáveis reais no lugar da menção ao Supabase). `agent_context/SDD.md`/`PRD.md` não tocados (já corretos desde as tarefas anteriores da migração, fora do escopo desta).
  **Limitação real encontrada nesta sessão, declarada em vez de simulada:** o daemon Docker não ficou disponível no ambiente do subagente — `com.docker.backend.exe` (Docker Desktop/WSL2) entrou em falha recorrente na inicialização (`rename sailor-ingest.sock ... sock.stale: The file cannot be accessed by the system`, um arquivo de socket órfão de uma sessão anterior que nem o kill dos processos, nem `wsl --terminate docker-desktop`, nem tentativas de exclusão via PowerShell/`cmd.exe` conseguiram remover — acesso negado pelo próprio Windows, não pelo sandbox do agente). Por isso, os comandos que exigem `mysql`/`minio` reais em pé (`docker compose up`, `npm run migrate:mysql` contra um banco vivo, `mc anonymous`, os `curl` de upload/leitura do MinIO) **não puderam ser reexecutados nesta sessão** — mas todos já tinham sido executados de verdade, com resultado real registrado, nas 8 tarefas técnicas anteriores desta migração (`migracao-mysql-schema` até `migracao-mysql-verificacao-ponta-a-ponta`, ver entradas acima e em `agent_context/CHANGELOG.md`), e a documentação reflete esse comportamento já verificado, não uma suposição nova. O que de fato pôde ser executado nesta sessão (sem depender de Docker) foi rodado e confirmado: `npm run build --workspace=@ketochlor/content-schema`, `npm run gerar-seed:mysql --prefix apps/api` (regenerou `apps/api/mysql/seed.sql` idêntico ao já commitado — confirma idempotência), `npm run build --prefix apps/api`, `npm run build --prefix apps/admin` (+ `grep -ril supabase apps/admin/dist/` vazio), a suíte de testes de Domínio da API (`npm run test --prefix apps/api -- domain`, 55/55) e os dois testes de unidade citados na documentação (`remover-operador.use-case.test.ts` 4/4, `login.use-case.test.ts` 4/4), e o comando de geração de hash `bcryptjs` documentado em `docs/PAINEL.md` § "Como testar localmente".

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

ajustes/migracao-mysql-infra-compose
  → ajustes/migracao-mysql-schema
  → ajustes/migracao-mysql-adapters-conteudo
  → ajustes/migracao-mysql-adapter-midia-minio
  → ajustes/migracao-mysql-minio-bucket-leitura-publica
  → ajustes/migracao-mysql-modulo-auth-proprio
  → ajustes/migracao-mysql-cutover-wiring
  → ajustes/migracao-mysql-painel-auth-e-upload
  → ajustes/migracao-mysql-minio-endpoint-publico
  → ajustes/migracao-mysql-dados-homologacao
  → ajustes/migracao-mysql-verificacao-ponta-a-ponta
  → ajustes/migracao-mysql-documentacao
```
