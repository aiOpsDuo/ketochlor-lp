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
| `api` | estágio `api` — builda `apps/api` e roda `node apps/api/dist/src/main.js` em `node:20-alpine` | nenhuma — só acessível pela rede interna do compose, pelo nome de serviço `api` | API NestJS; expõe `GET /api/health`, verificado pelo `healthcheck` do serviço |
| `proxy` | estágio `web` — builda `apps/lp` e `apps/admin` e serve os dois via nginx | `8080` (`http://localhost:8080`) | Ponto único de entrada: serve a LP em `/`, o painel em `/admin` e faz proxy reverso de `/api/` para o serviço `api` |
| `mysql` | imagem oficial `mysql:8.4.11` | nenhuma — só rede interna do compose | Banco relacional do CMS (conteúdo, metadados, mídia, leads, operadores) |
| `minio` | imagem oficial `quay.io/minio/minio` | `9000` (`http://localhost:9000`) — só a API S3, nunca o console de administração (9001) | Storage compatível com S3 usado por `media_assets`; publicada por precisar ser alcançável diretamente pelo navegador no upload direto de imagem (URL pré-assinada) — ver nota sobre `MINIO_ENDPOINT` abaixo |
| `minio-init` | imagem oficial `quay.io/minio/mc` | nenhuma | Roda uma vez, cria o bucket `images` e aplica a policy de leitura pública só de objeto (`docker/minio/init-bucket.sh`), e sai (`Exited (0)` é o estado esperado, não uma falha) |

`proxy` só inicia depois que `api` reporta `healthy`; `api` só inicia depois que `mysql` E `minio` reportam `healthy` (`depends_on: condition: service_healthy`, `docker-compose.yml`). `mysql`, assim como `api`, não publica porta nenhuma para o host — só `minio` precisa, pelo motivo detalhado em "Variáveis de ambiente" abaixo (`MINIO_ENDPOINT`). Detalhe completo do modelo de dados e do bucket: [`docs/BANCO-DE-DADOS.md`](BANCO-DE-DADOS.md).

## Verificação manual

```bash
curl -sI http://localhost:8080/            # LP — 200
curl -sI http://localhost:8080/admin       # painel — 200 (sem redirect)
curl -s  http://localhost:8080/api/health  # {"status":"ok"}
```

## Variáveis de ambiente

O serviço `api` exige as variáveis de MySQL/MinIO/auth própria abaixo — sem elas, `docker compose up --build` falha de imediato com uma mensagem clara do Compose (`defina <VAR> no .env`), em vez de subir a `api` em crash-loop. Copie [`.env.example`](../.env.example) (raiz do repositório) para `.env` antes de subir:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | sim | Senha `root` do MySQL — usada só pelo script de inicialização do usuário de aplicação, nunca pela `api` em runtime. |
| `MYSQL_DATABASE` | sim | Nome do banco do CMS. |
| `MYSQL_APP_USER` / `MYSQL_APP_PASSWORD` | sim | Usuário de aplicação — só CRUD, sem DDL (ver [`docs/BANCO-DE-DADOS.md`](BANCO-DE-DADOS.md)). É este usuário, nunca `root`, que a `api` usa em runtime. |
| `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD` | sim | Credencial do MinIO (mínimo 8 caracteres na senha) — usada tanto por `minio-init` (provisiona o bucket) quanto pela `api` (upload/URL pré-assinada); este compose não distingue uma credencial de aplicação de uma administrativa no MinIO. |
| `MINIO_BUCKET` | não (default `images`) | Bucket de imagens do CMS. |
| `MINIO_ENDPOINT` | não (default `http://localhost:9000`) | Endpoint que o navegador de fato alcança para o upload direto — ver "Por que `MINIO_ENDPOINT` importa" abaixo. |
| `AUTH_JWT_SECRET` | sim | Segredo HS256 **próprio da aplicação** (nunca de terceiro), usado para emitir/verificar o JWT de `POST /api/auth/login` — recomendado ≥32 caracteres. |

**Por que `MINIO_ENDPOINT` importa e por que a porta do `minio` é publicada:** o serviço `api` assina a URL de upload (SigV4, com o header `Host` como parte assinada) e monta `public_url` a partir de `MINIO_ENDPOINT` — nunca o hostname interno `minio:9000` (resolvível só dentro da rede do compose; reescrever a URL depois de assinada invalidaria a assinatura). Default em `docker-compose.yml`: `http://localhost:9000`, correto para desenvolvimento local (a mesma máquina roda o compose e abre o navegador — a assinatura em si não abre conexão de rede real a este valor, só o usa para compor a URL, então funciona mesmo lido de dentro do container da `api`). Em homologação/produção, quem publicar **precisa** sobrescrever essa variável no `.env` com o domínio/IP público real na porta exposta do MinIO. Achado real e correção desta migração — antes disso, um `PUT` de upload de fora do compose falhava com `Could not resolve host: minio` (ver `agent_context/CHANGELOG.md`, 2026-09-22, e `agent_context/PLAN.md`, tarefa `ajustes/migracao-mysql-minio-endpoint-publico`).

O painel (`apps/admin`, servido por `proxy` em `/admin`) não lê nenhuma variável de ambiente própria: login, upload de imagem e toda chamada administrativa falam com a API pelo caminho relativo `/api/*` (mesmo domínio, servido pelo `proxy`) — ver `apps/admin/.env.example`, mantido vazio de propósito.

## Quando reconstruir (`--build`) vs. só reiniciar

- Mudou uma variável de servidor (`MYSQL_*`, `MINIO_*`, `AUTH_JWT_SECRET`)? Basta `docker compose up -d` (sem `--build`) — o serviço `api` as lê de `process.env` em tempo de execução (`docker-compose.yml` → `environment:`), não em build.
- Mudou código de qualquer uma das três aplicações? `docker compose up --build -d`.

## O que quem for publicar precisa saber

1. **A `api` não é publicada no host.** O serviço não declara `ports`, só é alcançável pela rede interna do compose, pelo nome de serviço `api` — a única superfície exposta é a porta única do `proxy` (`8080`) e a porta S3 do `minio` (`9000`, necessária para o upload direto de imagem).
2. **Este compose não resolve TLS.** Quem for publicar precisa terminar HTTPS em algo na frente (load balancer do provedor, um proxy reverso adicional) e encaminhar para a porta do `proxy`.
3. **As migrations do MySQL não rodam sozinhas ao subir o compose.** `docker compose up` só builda e serve os cinco serviços; aplicar o schema é um passo à parte — `npm run migrate:mysql --prefix apps/api` — ver [BANCO-DE-DADOS.md](BANCO-DE-DADOS.md).
4. **`MINIO_ENDPOINT` precisa ser sobrescrita** com o domínio/IP público real do MinIO em qualquer ambiente que não seja a mesma máquina de desenvolvimento (ver acima).

## Verificação de segredo no bundle do proxy

Nenhuma credencial de servidor pode chegar ao navegador — o `proxy` só serve os builds estáticos de `apps/lp`/`apps/admin`, e nenhum dos dois deveria conter `MYSQL_APP_PASSWORD`/`MINIO_ROOT_PASSWORD`/`AUTH_JWT_SECRET`. O painel não lê nenhuma variável `VITE_*` própria nesta versão (ver "Variáveis de ambiente" acima), então não há mais um "controle positivo" natural de uma chave pública esperada no bundle — a varredura de string é ainda mais simples: nenhum segredo de servidor deveria aparecer em nenhum arquivo estático servido pelo `proxy`.

```bash
SEG=$(grep '^MYSQL_APP_PASSWORD=' .env | cut -d= -f2-)
JWTS=$(grep '^AUTH_JWT_SECRET=' .env | cut -d= -f2-)
MIO=$(grep '^MINIO_ROOT_PASSWORD=' .env | cut -d= -f2-)

docker exec -e SEG="$SEG" -e JWTS="$JWTS" -e MIO="$MIO" ketochlor-lp-proxy-1 sh -c '
  R=/usr/share/nginx/html
  echo "MYSQL_APP_PASSWORD (segredo):  $(grep -rlF "$SEG" $R | wc -l) ocorrencias"
  echo "AUTH_JWT_SECRET (segredo):     $(grep -rlF "$JWTS" $R | wc -l) ocorrencias"
  echo "MINIO_ROOT_PASSWORD (segredo): $(grep -rlF "$MIO" $R | wc -l) ocorrencias"
'
```

Confirmado nesta revisão: o bundle de produção do painel (`apps/admin/dist/`, gerado por `npm run build --prefix apps/admin` — o mesmo artefato que o estágio `web-build` do `docker/Dockerfile` embute em `/usr/share/nginx/html/admin`) não contém a string `"supabase"` em nenhum arquivo (`grep -ril supabase apps/admin/dist/` devolve vazio) — coerente com o painel não ter mais nenhuma variável de ambiente própria embutida em build time. A verificação completa contra os segredos de servidor reais, dentro do container `proxy` já em pé, segue o mesmo roteiro acima e está registrada em `agent_context/PLAN.md`/`CHANGELOG.md` (tarefas `ajustes/docker-compose-env-api` e `ajustes/migracao-mysql-cutover-wiring`, quando as variáveis ainda eram `SUPABASE_*`; o princípio de varredura não muda).

## Detalhes de implementação

- `docker/Dockerfile`: multi-stage — um estágio `deps` compartilhado (`node:20-alpine`) instala as dependências do monorepo inteiro (`npm ci` na raiz, já que `apps/*`/`packages/*` são workspaces); `web-build`/`api-build` partem dele, cada um buildando `packages/content-schema` antes de `apps/lp`/`apps/admin`/`apps/api` (nenhum dos três builda esse workspace sozinho — `npm ci` só resolve o link, não o `dist`); os estágios finais `web` (nginx) e `api` (`node:20-alpine`) só recebem o resultado do build, não as devDependencies. **Reversão de `node:22-alpine` para `node:20-alpine`** (tarefa `ajustes/migracao-mysql-cutover-wiring`): a imagem maior era exigida só por `@supabase/realtime-js` (dependência transitiva do SDK do Supabase, removido do projeto) precisar do `WebSocket` global nativo do Node 22 — build e subida real (`docker compose build`/`up`) confirmados sob `node:20-alpine` antes da troca, não presumidos. Ressalva registrada no próprio Dockerfile: o AWS SDK v3 (`@aws-sdk/client-s3`/`@aws-sdk/s3-request-presigner`, adaptador MinIO) emite aviso de depreciação avisando que versões publicadas depois de janeiro de 2027 vão exigir Node ≥22 — hoje é só aviso, não erro, mas é uma migração previsível a repetir.
- `docker/nginx.conf`: serve `apps/lp/dist` na raiz e `apps/admin/dist` em `/admin` (mesmo diretório de estáticos, sem `alias`, para que `/admin` sem barra final responda `200` sem redirect) e repassa `/api/` ao serviço `api` sem reescrever o caminho — a API já expõe suas rotas sob o prefixo global `/api`.
- **Metadados de SEO já vêm prontos no `index.html` servido pelo nginx** — não há nenhuma configuração de borda adicional aqui. `apps/lp/dist/index.html` já sai do build de `apps/lp` (estágio `web-build`) com `<title>`/`<meta name="description">`/`<meta property="og:image">` reais, embutidos pelo Injetor de SEO em tempo de build (hook `postbuild`, ver [`docs/API.md` § "Injetor de SEO"](API.md)); o `proxy` (nginx) só serve esse arquivo como está. Efeito prático: uma alteração de metadados só aparece em `http://localhost:8080/` depois de rebuildar a imagem `web` (`docker compose up --build`), não com um simples `docker compose restart`.

## Derrubar

```bash
docker compose down
```

Isso não interfere com `npm run dev` ([RODAR-SEM-DOCKER.md](RODAR-SEM-DOCKER.md)): a pilha Docker só ocupa a porta `8080` do host (a `api` não expõe porta nenhuma), enquanto `npm run dev` usa `5173`/`5174`/`3000` — os dois convivem sem conflito de porta.
