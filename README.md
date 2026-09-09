# Ketochlor LP

## Objetivo do projeto

Landing page B2B de captação de leads (médicos-veterinários) para o Ketochlor® (Virbac), evoluindo para um monorepo com CMS próprio: um painel em `/admin` permite à equipe editar todo o conteúdo da página e consultar/exportar os leads captados, sem depender de um desenvolvedor a cada ajuste. Ver [agent_context/PRD.md](agent_context/PRD.md) para o detalhamento completo de objetivo e escopo.

> **Status:** o CMS está em implementação, seguindo [agent_context/PLAN.md](agent_context/PLAN.md). O repositório já é um monorepo (`apps/lp`, `apps/admin`, `apps/api`, `packages/content-schema`) com ponto único de entrada em desenvolvimento; os módulos de negócio da API, o painel e o consumo do CMS pela LP ainda estão pendentes das próximas fases do plano.

## Stack

| Peça | Tecnologia |
|---|---|
| LP pública (`apps/lp`) | React 18 + Vite 5 + TypeScript 5 + Tailwind 3 |
| Painel (`apps/admin`) | React 18 + Vite 5 + TypeScript 5 |
| API do CMS (`apps/api`) | NestJS 11 (Node 20+) + TypeScript 5 |
| Plataforma de dados | Supabase (Postgres + Storage + Auth) |

Decisões e trade-offs de cada escolha: [agent_context/SDD.md § Decisões técnicas e trade-offs](agent_context/SDD.md).

## Como rodar localmente

```bash
npm install
npm run dev        # sobe LP + painel + API atrás de http://localhost:5173
npm run build      # build de produção de todos os workspaces
```

Com `npm run dev`, um único endereço serve tudo: `/` (LP), `/admin` (painel) e `/api/*` (API) — ver `agent_context/SDD.md` § "Ponto único de entrada".

Variáveis de ambiente da API (credenciais do Supabase, JWKS/JWT secret): ver [`apps/api/.env.example`](apps/api/.env.example) e [docs/API.md § Configuração](docs/API.md). Variáveis de ambiente do painel (URL e chave publicável do Supabase, para login/sessão): ver [`apps/admin/.env.example`](apps/admin/.env.example) e [docs/PAINEL.md § Configuração](docs/PAINEL.md).

## Saiba mais

- Arquitetura, decisões técnicas e diagramas: [agent_context/SDD.md](agent_context/SDD.md)
- Requisitos de produto: [agent_context/PRD.md](agent_context/PRD.md)
- Plano de implementação e status das tarefas: [agent_context/PLAN.md](agent_context/PLAN.md)
- Empacotamento e execução via Docker Compose: [docs/DOCKER.md](docs/DOCKER.md)
- Banco de dados, Storage e Auth locais (Supabase): [docs/BANCO-DE-DADOS.md](docs/BANCO-DE-DADOS.md)
- Conteúdo da LP, esquemas de seção e como adicionar um campo novo: [docs/CONTEUDO-DA-LP.md](docs/CONTEUDO-DA-LP.md)
- API: configuração, variáveis de ambiente e testes de integração: [docs/API.md](docs/API.md)
- Painel: configuração, autenticação e fluxo de login: [docs/PAINEL.md](docs/PAINEL.md)
