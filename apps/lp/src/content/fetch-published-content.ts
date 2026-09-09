import type { PublishedContent } from './published-content';

/**
 * Busca o conteúdo publicado das 11 seções + metadados da página em
 * `GET /api/content`.
 *
 * Caminho relativo de propósito (SDD § "Ponto único de entrada"): o proxy
 * de desenvolvimento do Vite e o nginx de produção já servem API e LP sob o
 * mesmo domínio, então não há URL absoluta nem variável de ambiente de
 * endereço de API a configurar aqui.
 *
 * Lança um `Error` explícito (nunca deixa uma exceção "crua" de `fetch`/
 * `Response.json` vazar sem contexto) em qualquer falha — erro de rede,
 * resposta HTTP não-2xx, ou corpo que não é JSON/não tem o formato
 * esperado. Quem chama (`PublishedContentProvider`) decide o que fazer com
 * a falha: cair para o instantâneo local (SDD § Riscos técnicos — "API
 * indisponível derrubando a LP").
 */
export async function fetchPublishedContent(): Promise<PublishedContent> {
  const resposta = await requisitarConteudo();

  if (!resposta.ok) {
    throw new Error(
      `GET /api/content respondeu ${resposta.status} ${resposta.statusText}`,
    );
  }

  const corpo = await interpretarComoJson(resposta);

  if (!ehConteudoPublicado(corpo)) {
    throw new Error(
      'Resposta de GET /api/content não tem o formato esperado ({ sections, metadata }).',
    );
  }

  return corpo;
}

async function requisitarConteudo(): Promise<Response> {
  try {
    return await fetch('/api/content');
  } catch (erroDeRede) {
    throw new Error(`Falha de rede ao buscar GET /api/content: ${String(erroDeRede)}`);
  }
}

async function interpretarComoJson(resposta: Response): Promise<unknown> {
  try {
    return await resposta.json();
  } catch (erroDeParse) {
    throw new Error(`Resposta de GET /api/content não é JSON válido: ${String(erroDeParse)}`);
  }
}

function ehConteudoPublicado(valor: unknown): valor is PublishedContent {
  if (typeof valor !== 'object' || valor === null) {
    return false;
  }
  const { sections, metadata } = valor as Record<string, unknown>;
  return (
    typeof sections === 'object' &&
    sections !== null &&
    typeof metadata === 'object' &&
    metadata !== null
  );
}
