#!/usr/bin/env node
// Injetor de metadados no HTML de build (SDD § "Contratos de dados/API/
// interfaces" → "Injetor de SEO"; tarefa `seo/injetor-metadados`).
//
// PRD § Requerimentos sistêmicos ("Descoberta por buscadores e previews de
// link") exige que `<title>`, `<meta name="description">` e
// `<meta property="og:image">` estejam presentes no HTML da PRIMEIRA
// resposta do servidor, sem depender de JavaScript. O SDD original (T2 —
// Injetor de SEO) descrevia isso como "função de borda da plataforma de
// hospedagem escolhida na implantação" — decisão adiada para a implantação.
//
// Esta tarefa decide a forma CONCRETA disponível hoje, sem esperar essa
// escolha de plataforma: reescreve `apps/lp/dist/index.html` logo depois de
// `vite build` (hook `postbuild`, ver `apps/lp/package.json`), usando os
// mesmos `metadata` já baixados pelo `prebuild` desta mesma pasta
// (`gerar-instantaneo-de-conteudo.mjs` → `src/content/content-snapshot.json`).
// Reaproveitar esse arquivo (em vez de uma segunda chamada de rede aqui)
// evita duplicar timeout/fallback e mantém as duas etapas de build
// consistentes com o mesmo instantâneo.
//
// Limitação registrada (ver `agent_context/SDD.md` § "Riscos técnicos e
// mitigação" e `agent_context/CHANGELOG.md`): isto é injeção EM TEMPO DE
// BUILD, não por requisição. Os metadados só atualizam no HTML servido após
// um novo `npm run build --prefix apps/lp` (+ novo deploy) — não
// imediatamente após salvar no painel, ao contrário do que já vale para
// `GET /api/content`. Um nginx puro (`sub_filter`) não consegue montar essa
// tag a partir de uma chamada de rede por requisição sem um módulo de
// scripting (`njs`/`ngx_http_js_module`) ou uma função de borda real da
// plataforma de hospedagem — nenhum dos dois existe hoje neste projeto. Dado
// que o operador já republica (novo build/deploy) toda vez que altera
// conteúdo por não haver reconstrução automática, este atraso é aceitável
// para o caso de uso real e cumpre o critério de aceitação literal do SDD:
// "verificável com uma requisição HTTP simples (sem executar JavaScript)".
//
// `metadata.ogImageUrl` (SDD § Modelo de dados; renomeada de
// `ogImageMediaId` na tarefa `ajustes/corrige-imagem-metadados`) já chega
// aqui como a URL pública pronta para `og:image`, ou `null` — nunca mais um
// id de `media_assets` sem resolução (a lacuna original: nenhuma rota da API
// jamais criava esse registro, então o id nunca virava URL utilizável). O
// domínio da API (`validarSiteMetadata`) já garante o formato `http(s)://`
// em `PUT /api/admin/metadata`, então este script poderia, em princípio,
// confiar cegamente no valor. Ainda assim mantém a mesma checagem defensiva
// de antes (`ehUrlAbsolutaHttp`) por uma razão distinta da original: o JSON
// de conteúdo publicado (`content-snapshot.json`, escrito num passo de build
// anterior a este) é uma superfície de confiança um degrau abaixo do
// domínio da API — nada impede um instantâneo desatualizado, editado à mão,
// ou gerado contra uma versão futura da API com uma regra diferente. Ignorar
// silenciosamente um valor fora do formato esperado (em vez de gravar uma
// tag `og:image` quebrada) é mais seguro que confiar sem checar, pelo mesmo
// custo de uma função já existente e testada.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const APP_LP_DIR = dirname(SCRIPTS_DIR);
const SNAPSHOT_PATH = join(APP_LP_DIR, 'src/content/content-snapshot.json');
const INDEX_HTML_PATH = join(APP_LP_DIR, 'dist/index.html');

/** Escapa texto para uso seguro dentro de um nó de texto HTML (ex.: `<title>…</title>`). */
export function escaparTextoHtml(valor) {
  return valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Escapa texto para uso seguro dentro do valor de um atributo HTML delimitado por aspas duplas. */
export function escaparAtributoHtml(valor) {
  return escaparTextoHtml(valor).replace(/"/g, '&quot;');
}

/**
 * `true` só para uma URL absoluta http(s) — checagem defensiva mínima sobre
 * `metadata.ogImageUrl` antes de gravá-lo como `og:image` (ver nota de
 * cabeçalho deste arquivo sobre por que essa checagem continua existindo
 * mesmo a API já validando o formato).
 */
export function ehUrlAbsolutaHttp(valor) {
  return typeof valor === 'string' && /^https?:\/\//i.test(valor.trim());
}

/**
 * Substitui o conteúdo de `<title>` já existente no HTML. Sem `<title>` no
 * documento (não deveria acontecer no `index.html` deste projeto, mas o
 * script não quebra por isso), o HTML volta inalterado.
 */
export function substituirTitle(html, title) {
  if (!/<title>[^]*?<\/title>/i.test(html)) {
    return html;
  }
  return html.replace(/<title>[^]*?<\/title>/i, `<title>${escaparTextoHtml(title)}</title>`);
}

/**
 * Substitui o `content` de `<meta name="description">` se a tag já existir;
 * insere uma nova logo antes de `</head>` caso contrário — `index.html`
 * sempre tem `</head>` (documento válido gerado pelo `vite build`).
 */
export function substituirOuInserirDescription(html, description) {
  const tagRegex = /<meta\s+name=["']description["'][^>]*>/i;
  const novaTag = `<meta name="description" content="${escaparAtributoHtml(description)}">`;
  if (tagRegex.test(html)) {
    return html.replace(tagRegex, novaTag);
  }
  return html.replace(/<\/head>/i, `${novaTag}\n  </head>`);
}

/**
 * Substitui o `content` de `<meta property="og:image">` se já existir;
 * insere uma nova logo antes de `</head>` caso contrário (o `index.html`
 * atual do projeto não tem essa tag ainda).
 */
export function substituirOuInserirOgImage(html, url) {
  const tagRegex = /<meta\s+property=["']og:image["'][^>]*>/i;
  const novaTag = `<meta property="og:image" content="${escaparAtributoHtml(url)}">`;
  if (tagRegex.test(html)) {
    return html.replace(tagRegex, novaTag);
  }
  return html.replace(/<\/head>/i, `${novaTag}\n  </head>`);
}

/**
 * Aplica os três metadados de `metadata` (título, descrição, imagem de
 * compartilhamento) ao HTML, um de cada vez e só quando o valor
 * correspondente está presente e não é uma string vazia/só espaços — um
 * campo vazio no `metadata` (ex.: nunca preenchido no painel) preserva o que
 * já está no `index.html` como default razoável, em vez de apagá-lo.
 */
export function injetarMetadados(html, metadata) {
  let resultado = html;

  const title = metadata?.title?.trim();
  if (title) {
    resultado = substituirTitle(resultado, title);
  }

  const description = metadata?.description?.trim();
  if (description) {
    resultado = substituirOuInserirDescription(resultado, description);
  }

  const ogImage = metadata?.ogImageUrl;
  if (ehUrlAbsolutaHttp(ogImage)) {
    resultado = substituirOuInserirOgImage(resultado, ogImage.trim());
  }

  return resultado;
}

export async function injetarMetadadosNoBuild({
  snapshotPath = SNAPSHOT_PATH,
  indexHtmlPath = INDEX_HTML_PATH,
} = {}) {
  let snapshot;
  try {
    snapshot = JSON.parse(await readFile(snapshotPath, 'utf-8'));
  } catch (erro) {
    console.warn(
      `[injetor-metadados] AVISO: não foi possível ler ${snapshotPath} (${erro.message}). ` +
        'Mantendo o index.html gerado pelo vite build sem alteração — o build NÃO falha por causa disso.',
    );
    return { injetado: false, motivo: erro.message };
  }

  let html;
  try {
    html = await readFile(indexHtmlPath, 'utf-8');
  } catch (erro) {
    console.warn(
      `[injetor-metadados] AVISO: não foi possível ler ${indexHtmlPath} (${erro.message}). ` +
        'O vite build talvez não tenha rodado ainda, ou tenha gerado outro caminho de saída.',
    );
    return { injetado: false, motivo: erro.message };
  }

  const htmlComMetadados = injetarMetadados(html, snapshot?.metadata);
  if (htmlComMetadados === html) {
    console.log(
      '[injetor-metadados] Nenhum campo de metadata preenchido no instantâneo — index.html mantido como estava.',
    );
    return { injetado: false, motivo: 'metadata vazio' };
  }

  await writeFile(indexHtmlPath, htmlComMetadados, 'utf-8');
  console.log(`[injetor-metadados] ${indexHtmlPath} atualizado com os metadados publicados.`);
  return { injetado: true };
}

const executadoDiretamente =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (executadoDiretamente) {
  await injetarMetadadosNoBuild();
}
