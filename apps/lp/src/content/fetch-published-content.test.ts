import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchPublishedContent } from './fetch-published-content';
import type { PublishedContent } from './published-content';

function mockarFetch(resposta: {
  ok: boolean;
  status?: number;
  statusText?: string;
  json?: () => Promise<unknown>;
}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: resposta.ok,
    status: resposta.status ?? (resposta.ok ? 200 : 500),
    statusText: resposta.statusText ?? (resposta.ok ? 'OK' : 'Internal Server Error'),
    json: resposta.json ?? (() => Promise.resolve({})),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('fetchPublishedContent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('busca GET /api/content e retorna o JSON tipado quando a API responde 200', async () => {
    const corpoEsperado: PublishedContent = {
      sections: {
        hero: null,
        problema: null,
        fenotipos: null,
        mecanismo: null,
        tecnologia_sis: null,
        prova_autoridade: null,
        protocolo: null,
        diferenciais: null,
        material_tecnico: null,
        cta_secundario: null,
        faq: null,
      },
      metadata: { title: 'Ketochlor', description: 'desc', ogImageUrl: null },
    };
    const fetchMock = mockarFetch({ ok: true, json: () => Promise.resolve(corpoEsperado) });

    const resultado = await fetchPublishedContent();

    expect(fetchMock).toHaveBeenCalledWith('/api/content');
    expect(resultado).toEqual(corpoEsperado);
  });

  it('lança um erro explícito quando a API responde HTTP não-2xx', async () => {
    mockarFetch({ ok: false, status: 503, statusText: 'Service Unavailable' });

    await expect(fetchPublishedContent()).rejects.toThrow(/503/);
  });

  it('lança um erro explícito quando o fetch rejeita (rede fora do ar)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(fetchPublishedContent()).rejects.toThrow(/Falha de rede/);
  });

  it('lança um erro explícito quando o corpo não é JSON válido', async () => {
    mockarFetch({ ok: true, json: () => Promise.reject(new Error('unexpected token')) });

    await expect(fetchPublishedContent()).rejects.toThrow(/JSON válido/);
  });

  it('lança um erro explícito quando o corpo não tem o formato { sections, metadata }', async () => {
    mockarFetch({ ok: true, json: () => Promise.resolve({ foo: 'bar' }) });

    await expect(fetchPublishedContent()).rejects.toThrow(/formato esperado/);
  });
});
