# Rodar sem Docker

O caminho documentado no [README.md](../README.md) é o Docker Compose (ver
[DOCKER.md](DOCKER.md)). Este arquivo existe para quem precisa de recarga
automática ao editar código, ou depurar um dos três processos isoladamente —
coisas que a pilha Docker, pensada para empacotar o produto já construído,
não oferece.

## Setup

```bash
npm install
cp apps/api/.env.example apps/api/.env      # e preencha os valores obrigatórios
cp apps/admin/.env.example apps/admin/.env  # e preencha as duas variáveis do Supabase
```

`apps/lp` não tem `.env` próprio: sua única variável (`CONTENT_SNAPSHOT_API_URL`,
usada só pelo script de `prebuild` que gera o instantâneo de conteúdo, nunca em
runtime do navegador) já tem um default e não precisa ser definida para rodar
localmente — ver [CONTEUDO-DA-LP.md § Instantâneo de conteúdo](CONTEUDO-DA-LP.md).

## Subir tudo (o jeito normal de acessar o projeto)

```bash
npm run dev
```

Sobe `apps/api`, `apps/admin` e `apps/lp` juntos (`scripts/dev.mjs`). Tudo
responde em **http://localhost:5173**, com o mesmo mapa de caminhos usado em
produção: `/` (LP), `/admin` (painel) e `/api/*` (API) — o dev server da LP
encaminha `/admin` e `/api` para os outros dois processos (`apps/lp/vite.config.ts`).
A recarga automática vale nos dois front-ends; a API reinicia sozinha a cada
alteração (`nest start --watch`). `Ctrl+C` encerra os três processos juntos.

## Outros comandos da raiz

```bash
npm run build        # build de produção de todos os workspaces
npm run typecheck    # checagem de tipos de todos os workspaces
npm run test         # testes de todos os workspaces (apps/api e apps/lp)
```

Não há `preview` na raiz — `apps/lp` e `apps/admin` têm o próprio, ver abaixo.

## Rodar uma aplicação isolada

Serve para depurar um processo específico — **não é a forma de acessar o
projeto**, essa é sempre `npm run dev` na raiz, acima:

```bash
npm run dev --prefix apps/api      # API sozinha, com recarga automática (nest start --watch)
npm run build --prefix apps/api && npm run start --prefix apps/api   # roda o build já gerado
npm run dev --prefix apps/admin    # painel sozinho
npm run build --prefix apps/admin && npm run preview --prefix apps/admin  # build do painel
npm run dev --prefix apps/lp       # LP sozinha
npm run build --prefix apps/lp && npm run preview --prefix apps/lp        # build da LP
```

`preview` de ambos usa a porta default do Vite (`4173`) — não rode os dois ao
mesmo tempo, o segundo falha por porta ocupada. O preview do painel serve só
em `/admin/` (mesma `base` do dev server); a raiz (`http://localhost:4173/`)
devolve um redirect (`302`) para `/admin/`.

## Portas internas

Detalhe interno — servem para depurar um processo isolado, não para o dia a
dia:

| Processo | Porta interna | Observação |
|---|---|---|
| LP (servidor de desenvolvimento) | 5173 | é a própria entrada única; encaminha `/admin` e `/api` |
| Painel | 5174 | serve só a partir de `/admin/` (`base: '/admin/'` em `apps/admin/vite.config.ts`); acessar a raiz (`http://localhost:5174/`) devolve um redirect (`302`) para `/admin/` |
| API | 3000 (`DEFAULT_PORT` em `apps/api/src/main.ts`, ajustável via `PORT`) | todas as rotas ficam sob o prefixo `/api` |

Como o encaminhamento de `/admin` e `/api` vive no servidor de desenvolvimento
da LP, subir só a LP isolada (`npm run dev --prefix apps/lp`) deixa `/admin` e
`/api` respondendo `500` (erro de proxy) até que os outros dois processos
existam — verificado subindo só `apps/lp` e chamando `curl` contra `/admin` e
`/api/health`. `npm run dev` na raiz sobe os três e evita esse problema.

## Verificações rápidas

Resultado real observado, com os três processos no ar (`npm run dev`):

```bash
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5173/          # -> 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5173/admin     # -> 200
curl -s -o /dev/null -w '%{http_code}\n' http://localhost:5173/admin/    # -> 200
curl -s http://localhost:5173/api/health                                 # -> {"status":"ok"}
```

## Variáveis de ambiente

Modeladas em [`../apps/api/.env.example`](../apps/api/.env.example) e
[`../apps/admin/.env.example`](../apps/admin/.env.example) — o que é
obrigatório e por quê está comentado em cada arquivo, e detalhado em
[API.md § Configuração](API.md) e [PAINEL.md § Configuração](PAINEL.md).

Este é um `.env` **por aplicação**; não confundir com o `.env` único que o
Docker Compose lê na raiz do repositório (ver
[DOCKER.md § Variáveis de ambiente](DOCKER.md)) — os dois não se sobrepõem, e
um não substitui o outro.
