# Ketochlor LP

## Objetivo do projeto

Landing page B2B de captação de leads (médicos-veterinários) para o Ketochlor® (Virbac), com CMS próprio: um painel em `/admin` permite à equipe editar todo o conteúdo da página e consultar/exportar os leads captados, sem depender de um desenvolvedor a cada ajuste. Ver [agent_context/PRD.md](agent_context/PRD.md) para o detalhamento completo de objetivo e escopo, e [docs/Regras-de-Negocio-CMS-Ketochlor-LP.docx](docs/Regras-de-Negocio-CMS-Ketochlor-LP.docx) para o inventário das regras de negócio efetivamente implementadas.

> **Status:** o CMS está completo — todas as tarefas de [agent_context/PLAN.md](agent_context/PLAN.md) foram concluídas e verificadas de ponta a ponta (`integracao/verificacao-ponta-a-ponta`). O monorepo (`apps/lp`, `apps/admin`, `apps/api`, `packages/content-schema`) roda atrás de um ponto único de entrada tanto em desenvolvimento quanto empacotado via Docker: a API expõe todos os módulos de negócio (conteúdo, metadados, mídia, leads), o painel cobre login, edição de seção, controle de visibilidade, metadados e consulta/exportação de leads, e a LP consome esse conteúdo publicado em runtime, com fallback a um instantâneo local.

## Stack

| Peça | Tecnologia |
|---|---|
| LP pública (`apps/lp`) | React 18 + Vite 5 + TypeScript 5 + Tailwind 3 |
| Painel (`apps/admin`) | React 18 + Vite 5 + TypeScript 5 |
| API do CMS (`apps/api`) | NestJS 11 (Node 22+) + TypeScript 5 |
| Plataforma de dados | Supabase (Postgres + Storage + Auth) |

Decisões e trade-offs de cada escolha: [agent_context/SDD.md § Decisões técnicas e trade-offs](agent_context/SDD.md).

## Como rodar localmente

```bash
cp .env.example .env   # e preencha (só na primeira vez)
docker compose up --build -d
```

Tudo responde em **http://localhost:8080**, com o mesmo mapa de caminhos usado em desenvolvimento: `/` (LP), `/admin` (painel) e `/api/*` (API) — ver `agent_context/SDD.md` § "Ponto único de entrada". Para acompanhar os logs, `docker compose logs -f`; para derrubar, `docker compose down`. Variáveis de ambiente, quando reconstruir a imagem e como verificar a pilha: [docs/DOCKER.md](docs/DOCKER.md).

Para editar com recarga automática, ou depurar um dos três processos isoladamente sem Docker: [docs/RODAR-SEM-DOCKER.md](docs/RODAR-SEM-DOCKER.md).

## Saiba mais

- Arquitetura, decisões técnicas e diagramas: [agent_context/SDD.md](agent_context/SDD.md)
- Requisitos de produto: [agent_context/PRD.md](agent_context/PRD.md)
- Plano de implementação e status das tarefas: [agent_context/PLAN.md](agent_context/PLAN.md)
- Empacotamento e execução via Docker Compose: [docs/DOCKER.md](docs/DOCKER.md)
- Rodar sem Docker (recarga automática, depurar um processo isolado): [docs/RODAR-SEM-DOCKER.md](docs/RODAR-SEM-DOCKER.md)
- Banco de dados, Storage e Auth locais (Supabase): [docs/BANCO-DE-DADOS.md](docs/BANCO-DE-DADOS.md)
- Conteúdo da LP, esquemas de seção e como adicionar um campo novo: [docs/CONTEUDO-DA-LP.md](docs/CONTEUDO-DA-LP.md)
- API: configuração, variáveis de ambiente e testes de integração: [docs/API.md](docs/API.md)
- Painel: configuração, autenticação e fluxo de login: [docs/PAINEL.md](docs/PAINEL.md)
- Publicar em homologação no Render (a pilha inteira num serviço só): [docs/RENDER.md](docs/RENDER.md)
