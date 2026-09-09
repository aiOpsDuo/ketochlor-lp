#!/usr/bin/env node
// Instantâneo de conteúdo (SDD § "Contratos de dados/API/interfaces" →
// "Instantâneo de conteúdo"): gera `apps/lp/src/content/content-snapshot.json`
// a partir de uma chamada real a `GET /api/content`, rodado como `prebuild`
// antes de `vite build` (ver `apps/lp/package.json`).
//
// `PublishedContentProvider.tsx` importa esse JSON estaticamente e o usa
// como conteúdo de reserva quando `GET /api/content` falha em runtime (SDD §
// "Riscos técnicos" — "API indisponível derrubando a LP"). Isso faz deste
// script, e não só do provider, parte da mitigação: se a API estiver fora do
// ar no momento do BUILD (ex.: CI/produção, onde nenhuma API de
// desenvolvimento está rodando), perder o último instantâneo bom seria pior
// do que simplesmente não atualizá-lo — por isso qualquer falha aqui avisa
// claramente no console e preserva o arquivo já existente, sem derrubar o
// build (saída sempre 0) e sem travar (timeout na requisição).
//
// URL da API configurável via `CONTENT_SNAPSHOT_API_URL`. Default:
// `http://localhost:3000/api/content` — o endereço direto da API (mesma
// porta padrão de `apps/api/src/main.ts`), não o proxy do dev server da LP
// (`http://localhost:5173`), porque este script roda como `prebuild` de
// `apps/lp` e não deve depender do próprio dev server da LP estar de pé.
// Em CI/build de produção esse default também não vai existir — é
// justamente o caso que este script trata sem falhar o build.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { CONTENT_SECTIONS } from '@ketochlor/content-schema';

const SCRIPTS_DIR = dirname(fileURLToPath(import.meta.url));
const APP_LP_DIR = dirname(SCRIPTS_DIR);
const SNAPSHOT_PATH = join(APP_LP_DIR, 'src/content/content-snapshot.json');

const DEFAULT_API_URL = 'http://localhost:3000/api/content';
const REQUEST_TIMEOUT_MS = 5000;

const CHAVES_DE_SECAO_ESPERADAS = Object.keys(CONTENT_SECTIONS);

/**
 * Valida a forma de `GET /api/content` (mesmo contrato verificado em runtime
 * por `src/content/fetch-published-content.ts`, reforçado aqui): um objeto
 * com `sections` e `metadata` (objetos), e `sections` contendo as 11 chaves
 * fechadas de `@ketochlor/content-schema` (fonte única — SDD § Riscos
 * técnicos, "Deriva entre o esquema de seção e o conteúdo já salvo").
 *
 * A checagem de chaves (não só "é um objeto") importa especificamente aqui:
 * ao contrário do runtime do navegador (que só tem `/api/content` do mesmo
 * domínio como opção), este script recebe a URL de uma variável de ambiente
 * — se ela apontar, por engano ou por colisão de porta com outro processo,
 * para QUALQUER outro serviço que devolva `{ sections: {...}, metadata:
 * {...} }` com outra forma, uma validação frouxa aceitaria esse conteúdo
 * estranho e sobrescreveria o instantâneo real com dado de outro produto —
 * quebrando o build da LP silenciosamente (só descoberto no erro de tipo do
 * `tsc -b`, tarde demais). Checar as chaves fechadas fecha esse risco aqui,
 * na validação, em vez de deixá-lo para o build descobrir.
 */
export function ehConteudoPublicadoValido(valor) {
  if (typeof valor !== 'object' || valor === null) {
    return false;
  }
  const { sections, metadata } = valor;
  if (typeof sections !== 'object' || sections === null) {
    return false;
  }
  if (typeof metadata !== 'object' || metadata === null) {
    return false;
  }
  return CHAVES_DE_SECAO_ESPERADAS.every((chave) =>
    Object.prototype.hasOwnProperty.call(sections, chave),
  );
}

/** JSON formatado de forma legível, com quebra de linha final. */
export function formatarInstantaneo(conteudo) {
  return `${JSON.stringify(conteudo, null, 2)}\n`;
}

/**
 * Busca `GET /api/content` com timeout — nunca deixa o `prebuild` travar
 * indefinidamente esperando uma API que nunca vai responder.
 */
async function buscarConteudoPublicado(apiUrl) {
  const controle = new AbortController();
  const timeout = setTimeout(() => controle.abort(), REQUEST_TIMEOUT_MS);

  let resposta;
  try {
    resposta = await fetch(apiUrl, { signal: controle.signal });
  } catch (erroDeRede) {
    throw new Error(`falha de rede ao buscar ${apiUrl}: ${String(erroDeRede)}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!resposta.ok) {
    throw new Error(`${apiUrl} respondeu ${resposta.status} ${resposta.statusText}`);
  }

  let corpo;
  try {
    corpo = await resposta.json();
  } catch (erroDeParse) {
    throw new Error(`resposta de ${apiUrl} não é JSON válido: ${String(erroDeParse)}`);
  }

  if (!ehConteudoPublicadoValido(corpo)) {
    throw new Error(
      `resposta de ${apiUrl} não tem o formato esperado ({ sections, metadata })`,
    );
  }

  return corpo;
}

export async function gerarInstantaneo({
  apiUrl = process.env.CONTENT_SNAPSHOT_API_URL ?? DEFAULT_API_URL,
  snapshotPath = SNAPSHOT_PATH,
} = {}) {
  try {
    const conteudo = await buscarConteudoPublicado(apiUrl);
    await writeFile(snapshotPath, formatarInstantaneo(conteudo), 'utf-8');
    console.log(
      `[instantaneo-de-conteudo] content-snapshot.json atualizado a partir de ${apiUrl}.`,
    );
    return { atualizado: true };
  } catch (motivoDaFalha) {
    console.warn(
      `[instantaneo-de-conteudo] AVISO: não foi possível atualizar content-snapshot.json a partir de ${apiUrl} (${motivoDaFalha.message}). ` +
        'Mantendo o instantâneo já existente no repositório — o build NÃO falha por causa disso.',
    );
    // Confirma que ao menos existe um instantâneo prévio para servir de
    // conteúdo de reserva; isso é só um alerta adicional (não falha o
    // build), já que a ausência do arquivo é um problema anterior a este
    // script (ex.: alguém apagou o arquivo do repositório).
    try {
      await readFile(snapshotPath, 'utf-8');
    } catch {
      console.warn(
        `[instantaneo-de-conteudo] AVISO adicional: nenhum content-snapshot.json anterior foi encontrado em ${snapshotPath}.`,
      );
    }
    return { atualizado: false, motivo: motivoDaFalha.message };
  }
}

const executadoDiretamente =
  process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];

if (executadoDiretamente) {
  await gerarInstantaneo();
}
