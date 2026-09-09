import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { CONTENT_SECTIONS } from '@ketochlor/content-schema';
import App from './App';
import type { PublishedContent } from './content/published-content';

/**
 * Conteúdo publicado completo, montado a partir do conteúdo inicial de
 * `@ketochlor/content-schema` — a mesma fonte que a API usa para validar e
 * que o instantâneo de conteúdo usaria em produção. Serve de fixture para
 * verificar que a LP migrada (`lp/migrar-secoes-para-cms`) de fato renderiza
 * o que `usePublishedContent()` entrega, em vez de `src/data/content.ts`.
 */
function construirConteudoCompleto(): PublishedContent {
  return {
    sections: {
      hero: CONTENT_SECTIONS.hero.initialContent,
      problema: CONTENT_SECTIONS.problema.initialContent,
      fenotipos: CONTENT_SECTIONS.fenotipos.initialContent,
      mecanismo: CONTENT_SECTIONS.mecanismo.initialContent,
      tecnologia_sis: CONTENT_SECTIONS.tecnologia_sis.initialContent,
      prova_autoridade: CONTENT_SECTIONS.prova_autoridade.initialContent,
      protocolo: CONTENT_SECTIONS.protocolo.initialContent,
      diferenciais: CONTENT_SECTIONS.diferenciais.initialContent,
      material_tecnico: CONTENT_SECTIONS.material_tecnico.initialContent,
      cta_secundario: CONTENT_SECTIONS.cta_secundario.initialContent,
      faq: CONTENT_SECTIONS.faq.initialContent,
    },
    metadata: { title: 'Ketochlor®', description: 'desc', ogImageMediaId: null },
  };
}

/**
 * jsdom não implementa `window.matchMedia` (usado por `ProvaAutoridade` para
 * ler `prefers-reduced-motion`); sem este stub, montar `<App>` inteiro
 * (necessário para testar visibilidade/conteúdo ponta a ponta) lança em
 * qualquer teste que renderize essa seção.
 */
function mockarMatchMedia() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

/**
 * jsdom também não implementa `IntersectionObserver` (usado por `Header`,
 * para destacar o item de menu ativo, e por `ProvaAutoridade`, para disparar
 * a animação dos contadores) — mesmo motivo do stub de `matchMedia` acima.
 */
function mockarIntersectionObserver() {
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
}

function mockarFetchDeConteudo(conteudo: PublishedContent) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(conteudo),
    }),
  );
}

describe('App', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('renderiza o conteúdo das seções migradas a partir de GET /api/content, não de src/data/content.ts', async () => {
    mockarMatchMedia();
    mockarIntersectionObserver();
    mockarFetchDeConteudo(construirConteudoCompleto());

    render(<App />);

    await waitFor(() =>
      expect(
        screen.getByText(CONTENT_SECTIONS.hero.initialContent.heading),
      ).toBeTruthy(),
    );
    expect(
      screen.getByText(CONTENT_SECTIONS.faq.initialContent.perguntas[0].question),
    ).toBeTruthy();
    expect(
      screen.getByText(CONTENT_SECTIONS.diferenciais.initialContent.items[0].titulo),
    ).toBeTruthy();
  });

  it('não renderiza uma seção despublicada (valor null vindo da API)', async () => {
    mockarMatchMedia();
    mockarIntersectionObserver();
    const conteudo = construirConteudoCompleto();
    conteudo.sections.diferenciais = null;
    mockarFetchDeConteudo(conteudo);

    render(<App />);

    await waitFor(() =>
      expect(
        screen.getByText(CONTENT_SECTIONS.hero.initialContent.heading),
      ).toBeTruthy(),
    );
    expect(
      screen.queryByText(CONTENT_SECTIONS.diferenciais.initialContent.heading),
    ).toBeNull();
  });

  it('mantém Header e Footer fixos (NAV_ITEMS/REFERENCIAS) mesmo com todas as seções despublicadas', async () => {
    mockarMatchMedia();
    mockarIntersectionObserver();
    const conteudo = construirConteudoCompleto();
    for (const key of Object.keys(conteudo.sections) as Array<keyof typeof conteudo.sections>) {
      conteudo.sections[key] = null;
    }
    mockarFetchDeConteudo(conteudo);

    render(<App />);

    await waitFor(() => expect(screen.getByText('FAQ')).toBeTruthy());
  });
});
