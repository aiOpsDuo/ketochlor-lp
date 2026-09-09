# Docker

Empacotamento de produção do ponto único de entrada já usado em desenvolvimento (ver [`agent_context/SDD.md` § "Ponto único de entrada"](../agent_context/SDD.md)): uma porta única no host expõe o mesmo mapa de caminhos — `/` (LP), `/admin` (painel), `/api/*` (API).

## Subir com Docker Compose

```bash
docker compose up --build -d
```

Aguarde o serviço `api` ficar `healthy` antes de testar (`docker compose ps` mostra o status). Para derrubar, ver [Derrubar](#derrubar) ao final.

## Serviços

| Serviço | Origem (`docker/Dockerfile`) | Porta publicada no host | O que faz |
|---|---|---|---|
| `api` | estágio `api` — builda `apps/api` e roda `node apps/api/dist/src/main.js` em `node:22-alpine` | nenhuma — só acessível pela rede interna do compose, pelo nome de serviço `api` | API NestJS; expõe `GET /api/health`, verificado pelo `healthcheck` do serviço |
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

## Quando reconstruir (`--build`) vs. só reiniciar

- Mudou uma variável `VITE_*` (`apps/admin/.env`)? Precisa de `docker compose up --build -d` — essas variáveis são lidas pelo Vite em tempo de build (estágio `web-build` do `docker/Dockerfile`) e já ficam embutidas no JavaScript servido pelo `proxy`; reiniciar o container não muda o que já foi compilado.
- Mudou uma variável de servidor (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`, `SUPABASE_JWKS_URL`, `SUPABASE_STORAGE_BUCKET`)? Basta `docker compose up -d` (sem `--build`) — o serviço `api` as lê de `process.env` em tempo de execução (`docker-compose.yml` → `environment:`), não em build.
- Mudou código de qualquer uma das três aplicações? `docker compose up --build -d`.

## O que quem for publicar precisa saber

1. **A `api` não é publicada no host.** O serviço não declara `ports`, só é alcançável pela rede interna do compose, pelo nome de serviço `api` — a única superfície exposta é a porta única do `proxy` (`8080`).
2. **Este compose não resolve TLS.** Quem for publicar precisa terminar HTTPS em algo na frente (load balancer do provedor, um proxy reverso adicional) e encaminhar para a porta do `proxy`.
3. **Nenhuma migração de banco roda aqui.** O compose só builda e serve as três aplicações; aplicar `supabase/migrations/` a um projeto Supabase real é um passo à parte — ver [BANCO-DE-DADOS.md](BANCO-DE-DADOS.md).

## Verificação de segredo no bundle do proxy

Nenhuma credencial de servidor pode chegar ao navegador — o `proxy` só serve os builds estáticos de `apps/lp`/`apps/admin`, e nenhum dos dois deveria conter `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_JWT_SECRET`. Verificado de verdade contra a pilha local (`docker compose up --build -d`), com um controle positivo — a chave publicável do painel (`VITE_SUPABASE_PUBLISHABLE_KEY`) **precisa** aparecer, senão a varredura não está olhando os arquivos certos:

```bash
SEG=$(grep '^SUPABASE_SERVICE_ROLE_KEY=' .env | cut -d= -f2-)
JWTS=$(grep '^SUPABASE_JWT_SECRET=' .env | cut -d= -f2-)
PUB=$(grep 'VITE_SUPABASE_PUBLISHABLE_KEY=' apps/admin/.env | cut -d= -f2-)

docker exec -e SEG="$SEG" -e JWTS="$JWTS" -e PUB="$PUB" ketochlor-lp-proxy-1 sh -c '
  R=/usr/share/nginx/html
  echo "SUPABASE_SERVICE_ROLE_KEY (segredo): $(grep -rlF "$SEG" $R | wc -l) ocorrencias"
  echo "SUPABASE_JWT_SECRET (segredo):        $(grep -rlF "$JWTS" $R | wc -l) ocorrencias"
  echo "controle positivo - VITE_SUPABASE_PUBLISHABLE_KEY deve aparecer:"
  grep -rlF "$PUB" $R
'
```

Resultado real, observado nesta verificação:

```
SUPABASE_SERVICE_ROLE_KEY (segredo): 0 ocorrencias
SUPABASE_JWT_SECRET (segredo):        0 ocorrencias
controle positivo - VITE_SUPABASE_PUBLISHABLE_KEY deve aparecer:
/usr/share/nginx/html/admin/assets/index-DA2xcGN1.js
```

Zero ocorrências dos dois segredos de servidor, com o controle positivo confirmando que a varredura de fato leu o bundle do painel (o nome do arquivo `index-*.js` muda a cada build — o que importa é a chave publicável aparecer em algum arquivo sob `admin/assets/`).

## Detalhes de implementação

- `docker/Dockerfile`: multi-stage — um estágio `deps` compartilhado (`node:22-alpine`, exigido em runtime por `@supabase/realtime-js`/`WebSocket` nativo) instala as dependências do monorepo inteiro (`npm ci` na raiz, já que `apps/*`/`packages/*` são workspaces); `web-build`/`api-build` partem dele, cada um buildando `packages/content-schema` antes de `apps/lp`/`apps/admin`/`apps/api` (nenhum dos três builda esse workspace sozinho — `npm ci` só resolve o link, não o `dist`); os estágios finais `web` (nginx) e `api` (`node:22-alpine`) só recebem o resultado do build, não as devDependencies.
- `docker/nginx.conf`: serve `apps/lp/dist` na raiz e `apps/admin/dist` em `/admin` (mesmo diretório de estáticos, sem `alias`, para que `/admin` sem barra final responda `200` sem redirect) e repassa `/api/` ao serviço `api` sem reescrever o caminho — a API já expõe suas rotas sob o prefixo global `/api`.
- **Metadados de SEO já vêm prontos no `index.html` servido pelo nginx** — não há nenhuma configuração de borda adicional aqui. `apps/lp/dist/index.html` já sai do build de `apps/lp` (estágio `web-build`) com `<title>`/`<meta name="description">`/`<meta property="og:image">` reais, embutidos pelo Injetor de SEO em tempo de build (hook `postbuild`, ver [`docs/API.md` § "Injetor de SEO"](API.md)); o `proxy` (nginx) só serve esse arquivo como está. Efeito prático: uma alteração de metadados só aparece em `http://localhost:8080/` depois de rebuildar a imagem `web` (`docker compose up --build`), não com um simples `docker compose restart`.

## Derrubar

```bash
docker compose down
```

Isso não interfere com `npm run dev` ([RODAR-SEM-DOCKER.md](RODAR-SEM-DOCKER.md)): a pilha Docker só ocupa a porta `8080` do host (a `api` não expõe porta nenhuma), enquanto `npm run dev` usa `5173`/`5174`/`3000` — os dois convivem sem conflito de porta.
