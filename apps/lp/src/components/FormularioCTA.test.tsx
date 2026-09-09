import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { CONTENT_SECTIONS } from '@ketochlor/content-schema';
import FormularioCTA from './FormularioCTA';
import { PublishedContentProvider } from '../content/PublishedContentProvider';
import type { PublishedContent } from '../content/published-content';

/**
 * Só `material_tecnico` importa para este componente; as demais seções ficam
 * `null` (formato válido de `GET /api/content` — seção despublicada).
 */
function construirConteudo(): PublishedContent {
  return {
    sections: {
      hero: null,
      problema: null,
      fenotipos: null,
      mecanismo: null,
      tecnologia_sis: null,
      prova_autoridade: null,
      protocolo: null,
      diferenciais: null,
      material_tecnico: CONTENT_SECTIONS.material_tecnico.initialContent,
      cta_secundario: null,
      faq: null,
    },
    metadata: { title: 'Ketochlor®', description: 'desc', ogImageMediaId: null },
  };
}

/**
 * Um único `fetch` global cobre tanto `GET /api/content` (buscado pelo
 * provider ao montar) quanto `POST /api/leads` (disparado pelo submit) —
 * esta função os distingue pela URL/método, do jeito que o navegador de
 * fato os dispara em sequência.
 */
function mockarFetch(respostaDoEnvio: {
  ok: boolean;
  status?: number;
  statusText?: string;
  json?: () => Promise<unknown>;
}) {
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url === '/api/content') {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(construirConteudo()),
      });
    }
    if (url === '/api/leads' && init?.method === 'POST') {
      return Promise.resolve({
        ok: respostaDoEnvio.ok,
        status: respostaDoEnvio.status ?? (respostaDoEnvio.ok ? 201 : 422),
        statusText:
          respostaDoEnvio.statusText ?? (respostaDoEnvio.ok ? 'Created' : 'Unprocessable Entity'),
        json: respostaDoEnvio.json ?? (() => Promise.resolve({})),
      });
    }
    return Promise.reject(new Error(`fetch não mockado para ${url}`));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

async function preencherCamposObrigatorios() {
  fireEvent.change(screen.getByPlaceholderText('Nome'), {
    target: { value: 'Dra. Ana Souza' },
  });
  fireEvent.change(screen.getByPlaceholderText('E-mail profissional'), {
    target: { value: 'ana.souza@example.com' },
  });
  fireEvent.change(screen.getByPlaceholderText('CRMV'), {
    target: { value: 'SP-12345' },
  });
}

async function renderizarFormulario() {
  render(
    <PublishedContentProvider>
      <FormularioCTA />
    </PublishedContentProvider>,
  );
  await waitFor(() => expect(screen.getByPlaceholderText('Nome')).toBeTruthy());
}

describe('FormularioCTA — envio para POST /api/leads', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('nenhuma referência a Salesforce permanece no componente', async () => {
    const fs = await import('fs/promises');
    const codigoFonte = await fs.readFile('src/components/FormularioCTA.tsx', 'utf-8');
    expect(codigoFonte).not.toMatch(/Salesforce/i);
  });

  it('submete os dados válidos, chama POST /api/leads e mostra a confirmação de sucesso só após o 201', async () => {
    const fetchMock = mockarFetch({ ok: true });
    await renderizarFormulario();
    await preencherCamposObrigatorios();

    fireEvent.click(screen.getByLabelText(/Li e aceito a política de privacidade/));
    fireEvent.click(screen.getByRole('button', { name: /QUERO ACESSAR/ }));

    await waitFor(() => expect(screen.getByText('Cadastro recebido.')).toBeTruthy());

    const chamadaDeLeads = fetchMock.mock.calls.find(([url]) => url === '/api/leads');
    expect(chamadaDeLeads).toBeTruthy();
    const corpoEnviado = JSON.parse((chamadaDeLeads?.[1] as RequestInit).body as string);
    expect(corpoEnviado).toMatchObject({
      nome: 'Dra. Ana Souza',
      email: 'ana.souza@example.com',
      crmv: 'SP-12345',
      consentimentoAceito: true,
      origem: 'material_tecnico',
    });
  });

  it('não envia nenhuma requisição a /api/leads quando o aceite de LGPD não está marcado', async () => {
    const fetchMock = mockarFetch({ ok: true });
    await renderizarFormulario();
    await preencherCamposObrigatorios();

    // Aceite de LGPD propositalmente não marcado.
    fireEvent.click(screen.getByRole('button', { name: /QUERO ACESSAR/ }));

    // Dá tempo de um possível envio assíncrono indevido ocorrer, se o guard falhar.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetchMock.mock.calls.some(([url]) => url === '/api/leads')).toBe(false);
    expect(screen.queryByText('Cadastro recebido.')).toBeNull();
  });

  it('mostra um erro visível e não navega para a tela de sucesso quando a API rejeita o envio (422)', async () => {
    mockarFetch({
      ok: false,
      status: 422,
      json: () =>
        Promise.resolve({
          statusCode: 422,
          message: 'Dados inválidos para o envio do formulário de Material Técnico.',
          erros: [],
        }),
    });
    await renderizarFormulario();
    await preencherCamposObrigatorios();

    fireEvent.click(screen.getByLabelText(/Li e aceito a política de privacidade/));
    fireEvent.click(screen.getByRole('button', { name: /QUERO ACESSAR/ }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.queryByText('Cadastro recebido.')).toBeNull();
  });

  it('mostra um erro visível quando o envio falha por erro de rede', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url === '/api/content') {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve(construirConteudo()),
        });
      }
      return Promise.reject(new Error('network down'));
    });
    vi.stubGlobal('fetch', fetchMock);
    await renderizarFormulario();
    await preencherCamposObrigatorios();

    fireEvent.click(screen.getByLabelText(/Li e aceito a política de privacidade/));
    fireEvent.click(screen.getByRole('button', { name: /QUERO ACESSAR/ }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeTruthy());
    expect(screen.queryByText('Cadastro recebido.')).toBeNull();
  });

  it('desabilita o botão e mostra "Enviando..." durante o envio, para impedir duplo clique', async () => {
    let resolverEnvio!: (value: unknown) => void;
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url === '/api/content') {
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: 'OK',
          json: () => Promise.resolve(construirConteudo()),
        });
      }
      if (url === '/api/leads' && init?.method === 'POST') {
        return new Promise((resolve) => {
          resolverEnvio = resolve;
        });
      }
      return Promise.reject(new Error(`fetch não mockado para ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);
    await renderizarFormulario();
    await preencherCamposObrigatorios();

    fireEvent.click(screen.getByLabelText(/Li e aceito a política de privacidade/));
    fireEvent.click(screen.getByRole('button', { name: /QUERO ACESSAR/ }));

    await waitFor(() => expect(screen.getByRole('button', { name: /Enviando/ })).toBeTruthy());
    const botao = screen.getByRole('button', { name: /Enviando/ }) as HTMLButtonElement;
    expect(botao.disabled).toBe(true);

    resolverEnvio({
      ok: true,
      status: 201,
      statusText: 'Created',
      json: () => Promise.resolve({}),
    });

    await waitFor(() => expect(screen.getByText('Cadastro recebido.')).toBeTruthy());
  });
});
