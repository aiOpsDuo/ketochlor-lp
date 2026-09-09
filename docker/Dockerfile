# Empacotamento Docker de produção (SDD § "Camadas e padrão arquitetural" →
# "Ponto único de entrada"): replica em produção o mesmo mapa de caminhos já
# usado em desenvolvimento (apps/lp/vite.config.ts + scripts/dev.mjs) — `/`
# serve a LP, `/admin` serve o painel, `/api/*` alcança a API — atrás de uma
# porta única. Build sempre a partir da raiz do monorepo (contexto = `.`),
# nunca a partir de `docker/`, porque os workspaces (`apps/*`,
# `packages/*`) precisam ser instalados juntos via `npm ci` na raiz.

# ---- deps: instala as dependências do monorepo inteiro uma única vez ----
# `node:22-alpine` (não 20, apesar de `engines.node` do repo aceitar ">=20"):
# `@supabase/realtime-js` (dependência transitiva de `@supabase/supabase-js`,
# usado por `apps/api`) exige `WebSocket` global nativo, disponível por
# padrão só a partir do Node 22 — em runtime real (não só imports de tipo),
# o cliente Supabase falha ao instanciar em Node 20 mesmo com todas as
# variáveis de ambiente corretas ("Node.js detected but native WebSocket not
# found").
FROM node:22-alpine AS deps
WORKDIR /repo
COPY package.json package-lock.json ./
COPY apps/lp/package.json apps/lp/package.json
COPY apps/admin/package.json apps/admin/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/content-schema/package.json packages/content-schema/package.json
RUN npm ci

# ---- web-build: builda os dois artefatos estáticos (LP + painel) ----
# `packages/content-schema` precisa ser buildado (`tsc`) antes: tanto o
# `prebuild` da LP (`apps/lp/scripts/gerar-instantaneo-de-conteudo.mjs`)
# quanto o painel importam `@ketochlor/content-schema` em tempo de build, e
# `npm ci` (estágio `deps`) não builda workspaces automaticamente — só
# resolve o link entre eles.
FROM deps AS web-build
COPY . .
RUN npm run build --workspace=packages/content-schema \
 && npm run build --prefix apps/lp \
 && npm run build --prefix apps/admin

# ---- web: serve os estáticos + proxy reverso via nginx ----
FROM nginx:1.27-alpine AS web
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
# apps/admin builda com `base: '/admin/'` (apps/admin/vite.config.ts) — por
# isso o dist do painel vai para o subdiretório /admin dentro da raiz servida
# pelo nginx, casando com os caminhos já gerados nos assets do build.
COPY --from=web-build /repo/apps/lp/dist /usr/share/nginx/html
COPY --from=web-build /repo/apps/admin/dist /usr/share/nginx/html/admin
EXPOSE 80

# ---- api-build: builda a API (precisa das devDependencies para `nest build`) ----
# Mesmo motivo do estágio `web-build` acima: `@ketochlor/content-schema` é
# dependência de produção da API (`apps/api/package.json`), não só de tipos
# (`validar-conteudo-secao.ts` importa `CONTENT_SECTIONS`, um valor real em
# runtime) — precisa estar buildado antes de `nest build`.
FROM deps AS api-build
COPY . .
RUN npm run build --workspace=packages/content-schema \
 && npm run build --prefix apps/api

# ---- api: instala só as dependências de produção da API, imagem enxuta ----
FROM node:22-alpine AS api
WORKDIR /repo
ENV NODE_ENV=production
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/content-schema/package.json packages/content-schema/package.json
RUN npm ci --omit=dev --workspace=apps/api
COPY --from=api-build /repo/packages/content-schema/dist ./packages/content-schema/dist
COPY --from=api-build /repo/apps/api/dist ./apps/api/dist
EXPOSE 3000
# `nest build` (tsc, ver apps/api/nest-cli.json `sourceRoot: "src"`) preserva
# `src/` dentro de `dist/` — o artefato real é `dist/src/main.js`, não
# `dist/main.js`.
CMD ["node", "apps/api/dist/src/main.js"]
