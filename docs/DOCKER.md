# Docker

Empacotamento de produção do ponto único de entrada já usado em desenvolvimento (ver [`agent_context/SDD.md` § "Ponto único de entrada"](../agent_context/SDD.md)): uma porta única no host expõe o mesmo mapa de caminhos — `/` (LP), `/admin` (painel), `/api/*` (API).

## Subir com Docker Compose

```bash
docker compose up --build -d
```

Aguarde o serviço `api` ficar `healthy` antes de testar (`docker compose ps` mostra o status). Para encerrar e liberar os recursos:

```bash
docker compose down
```

## Serviços

| Serviço | Origem (`docker/Dockerfile`) | Porta publicada no host | O que faz |
|---|---|---|---|
| `api` | estágio `api` — builda `apps/api` e roda `node apps/api/dist/main.js` em `node:20-alpine` | nenhuma — só acessível pela rede interna do compose, pelo nome de serviço `api` | API NestJS; expõe `GET /api/health`, verificado pelo `healthcheck` do serviço |
| `proxy` | estágio `web` — builda `apps/lp` e `apps/admin` e serve os dois via nginx | `8080` (`http://localhost:8080`) | Ponto único de entrada: serve a LP em `/`, o painel em `/admin` e faz proxy reverso de `/api/` para o serviço `api` |

`proxy` só inicia depois que `api` reporta `healthy` (`depends_on: condition: service_healthy` em `docker-compose.yml`).

## Verificação manual

```bash
curl -sI http://localhost:8080/            # LP — 200
curl -sI http://localhost:8080/admin       # painel — 200 (sem redirect)
curl -s  http://localhost:8080/api/health  # {"status":"ok"}
```

## Variáveis de ambiente

Nenhuma é exigida hoje: a fase `dados` do [`agent_context/PLAN.md`](../agent_context/PLAN.md) ainda não configurou o Supabase, então a API roda sem nenhuma credencial. Isso muda quando `dados/supabase-cli-init` e `api/infra-supabase-adapters` chegarem — este documento será atualizado com a lista de variáveis e o `.env.example` correspondente naquele momento.

## Detalhes de implementação

- `docker/Dockerfile`: multi-stage — um estágio `deps` compartilhado instala as dependências do monorepo inteiro (`npm ci` na raiz, já que `apps/*`/`packages/*` são workspaces); `web-build`/`api-build` partem dele para gerar os artefatos; os estágios finais `web` (nginx) e `api` (`node:20-alpine`) só recebem o resultado do build, não as devDependencies.
- `docker/nginx.conf`: serve `apps/lp/dist` na raiz e `apps/admin/dist` em `/admin` (mesmo diretório de estáticos, sem `alias`, para que `/admin` sem barra final responda `200` sem redirect) e repassa `/api/` ao serviço `api` sem reescrever o caminho — a API já expõe suas rotas sob o prefixo global `/api`.
- **Metadados de SEO já vêm prontos no `index.html` servido pelo nginx** — não há nenhuma configuração de borda adicional aqui. `apps/lp/dist/index.html` já sai do build de `apps/lp` (estágio `web-build`) com `<title>`/`<meta name="description">`/`<meta property="og:image">` reais, embutidos pelo Injetor de SEO em tempo de build (hook `postbuild`, ver [`docs/API.md` § "Injetor de SEO"](API.md)); o `proxy` (nginx) só serve esse arquivo como está. Efeito prático: uma alteração de metadados só aparece em `http://localhost:8080/` depois de rebuildar a imagem `web` (`docker compose up --build`), não com um simples `docker compose restart`.
