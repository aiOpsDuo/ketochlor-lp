import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import {
  PublishedContentProvider,
  usePublishedContent,
} from './PublishedContentProvider';
import contentSnapshot from './content-snapshot.json';

function Consumidor() {
  const { metadata, isLoading } = usePublishedContent();
  if (isLoading) {
    return <div>carregando</div>;
  }
  return <div>título: {metadata.title || '(vazio)'}</div>;
}

describe('PublishedContentProvider / usePublishedContent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('usa o conteúdo da API quando a busca funciona', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () =>
          Promise.resolve({
            sections: contentSnapshot.sections,
            metadata: { title: 'Título vindo da API', description: 'd', ogImageUrl: null },
          }),
      }),
    );

    render(
      <PublishedContentProvider>
        <Consumidor />
      </PublishedContentProvider>,
    );

    expect(screen.getByText('carregando')).toBeTruthy();
    await waitFor(() =>
      expect(screen.getByText('título: Título vindo da API')).toBeTruthy(),
    );
  });

  it('cai para o instantâneo local quando a busca falha, sem lançar exceção', async () => {
    const consoleErro = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('API fora do ar')));

    expect(() =>
      render(
        <PublishedContentProvider>
          <Consumidor />
        </PublishedContentProvider>,
      ),
    ).not.toThrow();

    await waitFor(() =>
      expect(screen.getByText(`título: ${contentSnapshot.metadata.title || '(vazio)'}`)).toBeTruthy(),
    );
    expect(consoleErro).toHaveBeenCalled();
  });

  it('cai para o instantâneo local quando a API responde HTTP não-2xx', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      }),
    );

    render(
      <PublishedContentProvider>
        <Consumidor />
      </PublishedContentProvider>,
    );

    await waitFor(() =>
      expect(screen.getByText(`título: ${contentSnapshot.metadata.title || '(vazio)'}`)).toBeTruthy(),
    );
  });

  it('usePublishedContent lança erro quando usado fora do provider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    function SemProvider() {
      usePublishedContent();
      return null;
    }

    expect(() => render(<SemProvider />)).toThrow(
      /usePublishedContent precisa ser usado dentro de um PublishedContentProvider/,
    );
  });
});
