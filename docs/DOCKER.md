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

O serviço `api` exige as variáveis do Supabase abaixo — sem elas, `docker compose up --build` falha de imediato com uma mensagem clara do Compose (`defina <VAR> no .env`), em vez de subir a `api` em crash-loop. Copie [`.env.example`](../.env.example) (raiz do repositório) para `.env` antes de subir:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `SUPABASE_URL` | sim | URL da API do projeto Supabase. Contra `npx supabase start` LOCAL, use `http://host.docker.internal:54321` — **nunca** `127.0.0.1`, que dentro do container da `api` aponta para o próprio container, não para o host (ver nota abaixo) |
| `SUPABASE_SERVICE_ROLE_KEY` | sim | Chave `service_role` — ignora Row Level Security |
| `SUPABASE_JWT_SECRET` | sim | Segredo HS256 legado (`GOTRUE_JWT_SECRET`), usado pelo verificador de token |
| `SUPABASE_JWKS_URL` | sim | URL do JWKS do projeto, usada para tokens assinados com chave assimétrica |
| `SUPABASE_STORAGE_BUCKET` | não (default `images`) | Bucket de Storage das imagens do CMS |

`SUPABASE_JWT_SECRET`/`SUPABASE_JWKS_URL`: o verificador de token da API (`apps/api/src/infrastructure/config/supabase-env.ts`) só exige pelo menos um dos dois; esta raiz exige ambos porque o Compose não expressa "um ou outro" nativamente, e a CLI local do Supabase já emite os dois por padrão.

**`host.docker.internal`, não `127.0.0.1`, contra Supabase local:** descoberto durante `integracao/verificacao-ponta-a-ponta` — dentro do container da `api`, `127.0.0.1` é o próprio container, não o host onde `npx supabase start` publica suas portas. O sintoma é enganoso: `/api/health` responde normal (não depende do Supabase), mas qualquer rota que de fato fale com o banco (login do painel, salvar seção, listar leads) falha com erro de rede (`401`/`500`). `host.docker.internal` já resolve neste projeto sem configuração adicional (Docker 20.10+); em algum Docker Engine Linux que não resolva, adicione `extra_hosts: ["host.docker.internal:host-gateway"]` ao serviço `api`. Contra um projeto Supabase de produção real, use a URL pública normalmente — o aviso vale só para testar o compose contra Supabase local.

Para rodar contra uma instância local do Supabase CLI (`npx supabase start`), os valores públicos e conhecidos de qualquer instância local estão documentados em [`docs/BANCO-DE-DADOS.md`](BANCO-DE-DADOS.md) e já preenchidos como default em `.env.example`. **Nunca** use esses valores contra um projeto Supabase real.

O painel (`apps/admin`, servido por `proxy` em `/admin`) lê suas próprias variáveis `VITE_SUPABASE_URL`/`VITE_SUPABASE_PUBLISHABLE_KEY` de `apps/admin/.env` em tempo de build do Vite (não do `.env` da raiz nem de build args do Compose) — ver `apps/admin/.env.example`. Sem esse arquivo o painel builda normalmente, mas falha ao carregar no navegador; isso não afeta a LP (`/`) nem o healthcheck da `api`.

## Detalhes de implementação

- `docker/Dockerfile`: multi-stage — um estágio `deps` compartilhado instala as dependências do monorepo inteiro (`npm ci` na raiz, já que `apps/*`/`packages/*` são workspaces); `web-build`/`api-build` partem dele para gerar os artefatos; os estágios finais `web` (nginx) e `api` (`node:20-alpine`) só recebem o resultado do build, não as devDependencies.
- `docker/nginx.conf`: serve `apps/lp/dist` na raiz e `apps/admin/dist` em `/admin` (mesmo diretório de estáticos, sem `alias`, para que `/admin` sem barra final responda `200` sem redirect) e repassa `/api/` ao serviço `api` sem reescrever o caminho — a API já expõe suas rotas sob o prefixo global `/api`.
- **Metadados de SEO já vêm prontos no `index.html` servido pelo nginx** — não há nenhuma configuração de borda adicional aqui. `apps/lp/dist/index.html` já sai do build de `apps/lp` (estágio `web-build`) com `<title>`/`<meta name="description">`/`<meta property="og:image">` reais, embutidos pelo Injetor de SEO em tempo de build (hook `postbuild`, ver [`docs/API.md` § "Injetor de SEO"](API.md)); o `proxy` (nginx) só serve esse arquivo como está. Efeito prático: uma alteração de metadados só aparece em `http://localhost:8080/` depois de rebuildar a imagem `web` (`docker compose up --build`), não com um simples `docker compose restart`.
