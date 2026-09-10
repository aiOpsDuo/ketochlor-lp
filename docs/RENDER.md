# Publicar no Render

Ambiente de **homologação** — teste interno da equipe, o mesmo papel dos
containers Docker que hoje rodam para QA. Não existe projeto de produção do
cliente (ver `agent_context/CHANGELOG.md`, 2026-09-10). "Produção" aparece
neste projeto só no sentido de modo de build (`NODE_ENV=production`).

A pilha inteira num serviço só, numa origem só:

| Caminho | Serve |
|---|---|
| `https://<nome>.onrender.com/` | LP (`apps/lp`) |
| `https://<nome>.onrender.com/admin` | painel (`apps/admin`) |
| `https://<nome>.onrender.com/api/*` | API (`apps/api`) |

É o mesmo **ponto único de entrada** do [SDD](../agent_context/SDD.md) que já vale
em desenvolvimento (proxy do Vite) e no Docker Compose (nginx): painel e LP têm
de dividir a mesma origem.

## Por que não a mesma pilha do `docker-compose.yml`

Localmente são dois contêineres — a API e um nginx que une os caminhos
([`docker/nginx.conf`](../docker/nginx.conf)). No Render um serviço é **um
processo com uma porta**.

Duas saídas eram possíveis:

1. **Dois serviços**, um com o nginx encaminhando para o outro. Dá o endereço
   certo, ao custo de uma peça a mais para pagar e para cair.
2. **Um serviço**, com a própria API servindo os dois `dist`. É a escolhida.

Um serviço estático + um serviço web *não* resolve: seriam dois endereços, e o
painel deixaria de estar em `<url>/admin`.

Então quem faz o papel do nginx é
[`apps/api/src/presentation/static-sites.ts`](../apps/api/src/presentation/static-sites.ts)
— o mesmo mapa de caminhos, escrito em middleware, com o mesmo cuidado com
barra final em `/admin` e com cache imutável só para arquivo com hash no nome.

Como a LP e o painel chamam a API por caminho relativo (`/api/content`,
`/api/admin/...`), origem única também quer dizer **nenhuma requisição entre
origens** — é por isso que a API não precisa liberar CORS.

Nada disso muda o desenvolvimento local: `docker compose up` e `npm run dev`
continuam iguais, com nginx e Vite servindo os front-ends. Sem os `dist` ao
lado, `static-sites.ts` não monta nada e a API sobe idêntica.

## Publicar

1. No painel do Render: **New > Blueprint**, aponte para este repositório.
   Ele lê [`render.yaml`](../render.yaml) da raiz.
2. O Render pede os valores das variáveis marcadas com `sync: false`. São as
   mesmas de `apps/api/.env.example` e `apps/admin/.env.example`:

   | Variável | Onde encontrar |
   |---|---|
   | `SUPABASE_URL` | Supabase > Project Settings > Data API |
   | `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Project Settings > API Keys — `service_role` |
   | `SUPABASE_JWKS_URL` | `<SUPABASE_URL>/auth/v1/.well-known/jwks.json` |
   | `VITE_SUPABASE_URL` | o mesmo valor de `SUPABASE_URL` |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase > Project Settings > API Keys — `anon`/publicável |

   O projeto de homologação está descrito em
   [docs/BANCO-DE-DADOS.md](BANCO-DE-DADOS.md) § Homologação.

   > `SUPABASE_JWT_SECRET` não é pedida. A API exige **ou** ela **ou**
   > `SUPABASE_JWKS_URL` (ver
   > [`supabase-env.ts`](../apps/api/src/infrastructure/config/supabase-env.ts));
   > contra um projeto Supabase atual, que assina com chave assimétrica, a
   > certa é o JWKS. Só um projeto legado que nunca migrou precisa do segredo
   > HS256 — nesse caso, descomente a entrada no `render.yaml`.

3. Aplique e verifique, na ordem — é a ordem em que as falhas aparecem:

   ```bash
   curl -i https://<nome>.onrender.com/api/health   # {"status":"ok"}
   curl -I https://<nome>.onrender.com/             # 200, text/html
   curl -I https://<nome>.onrender.com/admin        # 301 -> /admin/
   curl -I https://<nome>.onrender.com/admin/       # 200, text/html
   ```

   E no navegador: `/admin/` deve pedir login, e o login deve levar ao painel.
   O operador precisa existir no Supabase Auth do projeto — ver
   [docs/PAINEL.md](PAINEL.md).

## Serviço criado à mão: o que ajustar no painel

Um serviço criado pelo painel **não passa a seguir o `render.yaml` sozinho** —
o blueprint só governa os serviços que ele mesmo criou. Se o serviço já existe,
o que precisa mudar em **Settings** e **Environment** é:

| Onde | Campo | Precisa ser |
|---|---|---|
| Settings > Build & Deploy | Branch | `deploy-homolog` |
| Settings > Build & Deploy | Build Command | `npm ci --include=dev && npm run build -w packages/content-schema && npm run build -w apps/lp && npm run build -w apps/admin && npm run build -w apps/api` |
| Settings > Build & Deploy | Start Command | `node apps/api/dist/src/main.js` |
| Settings > Health Checks | Health Check Path | `/api/health` |
| Environment | `NODE_VERSION` | `22` |
| Environment | `NODE_ENV` | `production` |
| Environment | as cinco da tabela acima | os valores do projeto Supabase |

## As armadilhas que este arranjo evita

Cada uma custou um deploy que sobe e não funciona. Estão comentadas no
`render.yaml` e repetidas aqui porque é aqui que se procura quando falha.

- **`NODE_VERSION` 22, não 20.** `@supabase/supabase-js` (^2.116) exige o
  `WebSocket` global nativo, que só existe a partir do Node 22. Em Node 20 a
  API sobe, inicializa os módulos e morre ao instanciar o cliente com
  `Node.js detected but native WebSocket not found` — em laço de reinício, sem
  nunca ficar saudável. É a mesma razão do `node:22-alpine` do
  [`docker/Dockerfile`](../docker/Dockerfile).

- **`--include=dev` no `npm ci`.** `NODE_ENV=production` vale também durante o
  build, e o npm o trata como `--omit=dev`. Sem o `--include=dev`, o build morre
  no `tsc -b` da LP: `vite`, `typescript`, `tailwindcss` e `@nestjs/cli` são
  todos devDependencies.

- **`packages/content-schema` antes dos três apps.** `npm ci` só cria o link
  entre workspaces, não builda nenhum, e o pacote aponta `main` para `dist/`.
  Sem esse passo, o `prebuild` da LP quebra ao importar `CONTENT_SECTIONS`.
  (`packages/design-tokens` fica de fora de propósito: não tem script `build`
  — é TypeScript puro que o loader do Tailwind transpila sozinho.)

- **`dist/src/main.js`, não `dist/main.js`.** `nest build` preserva `src/`
  dentro de `dist/` (`apps/api/nest-cli.json`, `sourceRoot: "src"`).

- **`app.listen(port, '0.0.0.0')`.** Escutando só em localhost, o Render não
  encontra porta aberta e o deploy fica preso em *no open ports detected*.

- **`healthCheckPath`.** Sem ele, uma publicação que sobe e morre em laço passa
  por saudável.

## Node nativo ou Docker

`render.yaml` declara `runtime: node`: o Render instala as dependências e roda
os comandos direto, sem imagem. É o caminho mais curto e o que está em uso.

[`docker/Dockerfile.render`](../docker/Dockerfile.render) é a alternativa —
mesmo código, mesmos caminhos, num contêiner. Vale a troca se um dia o
ambiente do Render divergir do que se testa localmente, porque aí a imagem
passa a ser a mesma nos dois lugares. Para usar, troque no `render.yaml`:

```yaml
    runtime: docker
    dockerfilePath: ./docker/Dockerfile.render
    dockerContext: .
```

e remova `buildCommand`/`startCommand` (a imagem já traz os dois). As variáveis
`VITE_*` viram argumentos de build automaticamente — o Dockerfile já declara os
`ARG` correspondentes.

`docker/Dockerfile` (o do Compose) continua separado e intocado: ele produz
duas imagens, API e nginx, que é o desenho certo para rodar local.

## O instantâneo de conteúdo no build

O `prebuild` da LP
([`gerar-instantaneo-de-conteudo.mjs`](../apps/lp/scripts/gerar-instantaneo-de-conteudo.mjs))
tenta baixar `GET /api/content` de uma API no ar para atualizar
`src/content/content-snapshot.json` — a reserva que a LP usa se a API estiver
fora do ar em runtime.

No Render não há API rodando durante o build. O script falha em silêncio,
preserva o instantâneo já commitado e **não derruba o build** — comportamento
projetado, não acidente. Se quiser que cada deploy embarque o conteúdo mais
recente, defina `CONTENT_SNAPSHOT_API_URL` apontando para o próprio serviço já
publicado (a entrada está comentada no `render.yaml`); deixe-a de fora no
primeiro deploy, quando o serviço ainda não existe.

Lembrando o que isso não resolve: os metadados de SEO são injetados no HTML em
tempo de build ([`injetar-metadados.mjs`](../apps/lp/scripts/injetar-metadados.mjs)),
então mudar título/descrição no painel só aparece no HTML depois de um novo
deploy. Salvar conteúdo de seção, esse sim, aparece na hora — a LP lê
`/api/content` em runtime.

## Plano gratuito

`plan: free` hiberna o serviço depois de 15 min sem tráfego, e a primeira visita
seguinte espera o processo subir (perto de um minuto). Para quem vai validar
conteúdo no painel isso incomoda; `starter` não hiberna, e a troca é uma linha
no `render.yaml`.
