import { existsSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { Logger } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import type { Request, Response, NextFunction } from 'express';
import { API_GLOBAL_PREFIX } from './auth/route-prefixes';

/**
 * Serve a LP e o painel pelo próprio processo da API, para que as três peças
 * respondam numa **origem única** sem nginx na frente.
 *
 * Existe por causa da publicação em serviço gerenciado (Render): lá um serviço
 * é um contêiner com uma porta só, e o produto precisa de `/`, `/admin` e
 * `/api/*` no mesmo endereço — `/admin` é o ponto único de entrada exigido
 * pelo SDD (§ "Camadas e padrão arquitetural" → "Ponto único de entrada"),
 * não conveniência. `docker-compose.yml` e `npm run dev` continuam valendo
 * para desenvolvimento e homologação local; este módulo é o MESMO mapa de
 * caminhos de `docker/nginx.conf`, escrito em middleware:
 *
 *   /        -> apps/lp/dist
 *   /admin   -> apps/admin/dist (build com `base: '/admin/'`, ver vite.config.ts)
 *   /api/*   -> os controllers do Nest, intocados
 *
 * Se um dos `dist` não existir, a peça simplesmente não é servida e a API sobe
 * igual. É o que mantém os testes, o `npm run dev` e o `docker compose up`
 * — onde quem serve os front-ends é o Vite ou o nginx — funcionando sem
 * nenhuma condição especial.
 */

/** Caminho público do painel, sem barra final. */
const ADMIN_BASE = '/admin';

/** Nome da pasta de assets com hash no nome — a única que pode ser imutável. */
const ASSETS_DIR = 'assets';

const IMMUTABLE_CACHE = 'public, max-age=31536000, immutable';

const logger = new Logger('StaticSites');

/**
 * `dist` de cada front-end, relativo a este arquivo COMPILADO. `nest build`
 * preserva `src/` dentro de `dist/` (ver `apps/api/nest-cli.json`,
 * `sourceRoot: "src"`), então em execução `__dirname` é
 * `apps/api/dist/src/presentation` — quatro níveis abaixo de `apps/`, e não
 * três. É por isso que o caminho não pode ser derivado do diretório de
 * trabalho: `__dirname` é a única referência estável, valha o processo ter
 * subido da raiz do repositório (Render) ou de `/repo` (imagem Docker).
 */
function distPath(app: 'lp' | 'admin'): string {
  return resolve(__dirname, '..', '..', '..', '..', app, 'dist');
}

/**
 * Só arquivo com hash no nome recebe cache imutável. `index.html` nunca: é ele
 * que aponta para o bundle novo depois de cada publicação, e um `index.html`
 * imutável deixaria o navegador preso na versão anterior.
 */
function setAssetHeaders(response: Response, filePath: string): void {
  if (filePath.includes(`${sep}${ASSETS_DIR}${sep}`)) {
    response.setHeader('Cache-Control', IMMUTABLE_CACHE);
  }
}

/**
 * `index: false` e `redirect: false` deixam toda decisão de "qual index.html" e
 * de barra final para o middleware de fallback, num lugar só.
 */
const STATIC_OPTIONS = {
  index: false,
  redirect: false,
  setHeaders: setAssetHeaders,
} as const;

function isApiPath(path: string): boolean {
  return path === `/${API_GLOBAL_PREFIX}` || path.startsWith(`/${API_GLOBAL_PREFIX}/`);
}

/**
 * Um pedido de asset que chegou até aqui é asset que NÃO existe: devolver o
 * `index.html` faria o navegador receber HTML no lugar de um `.js` e falhar
 * com erro de tipo MIME, que esconde a causa real (build desatualizado, asset
 * removido). Deixa seguir para o 404, que diz a verdade.
 */
function isMissingAsset(path: string): boolean {
  return (
    path.startsWith(`/${ASSETS_DIR}/`) || path.startsWith(`${ADMIN_BASE}/${ASSETS_DIR}/`)
  );
}

/**
 * Fallback de SPA: caminho que não casou com arquivo nenhum devolve o
 * `index.html` do front-end correspondente, para o roteador do React assumir.
 * Equivale aos `try_files ... /index.html` de `docker/nginx.conf`.
 */
function createSpaFallback(lpIndex: string | undefined, adminIndex: string | undefined) {
  return function spaFallback(
    request: Request,
    response: Response,
    next: NextFunction,
  ): void {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      next();
      return;
    }

    if (isApiPath(request.path) || isMissingAsset(request.path)) {
      next();
      return;
    }

    // O roteador do painel (`react-router-dom`) deixa o endereço em `/admin`,
    // sem barra, depois do login. Recarregar ali precisa devolver o PAINEL, e
    // não a LP — mesmo cuidado do `location = /admin` do nginx e do `rewrite`
    // do proxy de desenvolvimento em `apps/lp/vite.config.ts`. Aqui é um
    // redirect (e não o `index.html` direto como no nginx) porque o painel
    // builda com `base: '/admin/'`: servido em `/admin`, o navegador
    // resolveria `/assets/...` a partir da RAIZ e buscaria os assets do painel
    // no lugar errado.
    if (request.path === ADMIN_BASE) {
      response.redirect(301, `${ADMIN_BASE}/`);
      return;
    }

    const index = request.path.startsWith(`${ADMIN_BASE}/`) ? adminIndex : lpIndex;
    if (index === undefined) {
      next();
      return;
    }

    response.sendFile(index);
  };
}

/**
 * Monta o serviço de arquivos das duas SPAs. Chamada em `main.ts` depois do
 * `setGlobalPrefix` e ANTES do `listen` (é o `listen` que registra o roteador
 * do Nest, então tudo daqui roda antes dos controllers — e por isso
 * `isApiPath` existe). Devolve quais peças foram encontradas, para o log de
 * inicialização dizer o que de fato está no ar.
 */
export function serveStaticSites(app: NestExpressApplication): {
  lp: boolean;
  admin: boolean;
} {
  const lpDist = distPath('lp');
  const adminDist = distPath('admin');

  const lpIndex = join(lpDist, 'index.html');
  const adminIndex = join(adminDist, 'index.html');

  const hasLp = existsSync(lpIndex);
  const hasAdmin = existsSync(adminIndex);

  if (hasAdmin) {
    // O painel primeiro: o `express.static` da LP está montado na raiz e veria
    // `/admin/...` como caminho seu, sem nada para casar.
    app.useStaticAssets(adminDist, { ...STATIC_OPTIONS, prefix: ADMIN_BASE });
  } else {
    logger.warn(`Painel não encontrado em ${adminDist} — /admin não será servido.`);
  }

  if (hasLp) {
    app.useStaticAssets(lpDist, STATIC_OPTIONS);
  } else {
    logger.warn(`LP não encontrada em ${lpDist} — a raiz não será servida.`);
  }

  if (hasLp || hasAdmin) {
    app.use(
      createSpaFallback(hasLp ? lpIndex : undefined, hasAdmin ? adminIndex : undefined),
    );
  }

  return { lp: hasLp, admin: hasAdmin };
}
