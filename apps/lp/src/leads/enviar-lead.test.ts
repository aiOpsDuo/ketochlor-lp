import { afterEach, describe, expect, it, vi } from 'vitest';
import { enviarLead, paraLeadPayload, type LeadPayload } from './enviar-lead';
import type { LeadFormData } from '../types';

function mockarFetch(resposta: {
  ok: boolean;
  status?: number;
  statusText?: string;
  json?: () => Promise<unknown>;
}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: resposta.ok,
    status: resposta.status ?? (resposta.ok ? 201 : 422),
    statusText: resposta.statusText ?? (resposta.ok ? 'Created' : 'Unprocessable Entity'),
    json: resposta.json ?? (() => Promise.resolve({})),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const PAYLOAD_VALIDO: LeadPayload = {
  nome: 'Dra. Ana Souza',
  email: 'ana.souza@example.com',
  consentimentoAceito: true,
};

describe('enviarLead', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('envia POST /api/leads com o corpo em JSON e resolve sem erro quando a API responde 201', async () => {
    const fetchMock = mockarFetch({ ok: true });

    await expect(enviarLead(PAYLOAD_VALIDO)).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledWith('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(PAYLOAD_VALIDO),
    });
  });

  it('lança um erro com a mensagem da API quando a resposta é 422', async () => {
    mockarFetch({
      ok: false,
      status: 422,
      statusText: 'Unprocessable Entity',
      json: () =>
        Promise.resolve({
          statusCode: 422,
          message: 'Dados inválidos para o envio do formulário de Material Técnico.',
          erros: [{ campo: 'email', mensagem: 'O e-mail informado não é válido.' }],
        }),
    });

    await expect(enviarLead(PAYLOAD_VALIDO)).rejects.toThrow(
      'Dados inválidos para o envio do formulário de Material Técnico.',
    );
  });

  it('lança um erro genérico quando a resposta não-2xx não tem corpo JSON com message', async () => {
    mockarFetch({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: () => Promise.reject(new Error('sem corpo')),
    });

    await expect(enviarLead(PAYLOAD_VALIDO)).rejects.toThrow(/500/);
  });

  it('lança um erro explícito quando o fetch rejeita (rede fora do ar)', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));

    await expect(enviarLead(PAYLOAD_VALIDO)).rejects.toThrow(/Falha de rede/);
  });
});

describe('paraLeadPayload', () => {
  const formCompleto: LeadFormData = {
    nome: 'Dr. João Lima',
    email: 'joao.lima@example.com',
    telefone: '11999990000',
    crmv: 'SP-12345',
    estadoCidade: 'São Paulo/SP',
    especialidade: 'Clínica geral',
    jaClienteVirbac: true,
    desejaContatoComercial: false,
    aceitaLGPD: true,
  };

  it('mapeia aceitaLGPD para consentimentoAceito e preserva os demais campos', () => {
    expect(paraLeadPayload(formCompleto)).toEqual({
      nome: 'Dr. João Lima',
      email: 'joao.lima@example.com',
      telefone: '11999990000',
      crmv: 'SP-12345',
      estadoCidade: 'São Paulo/SP',
      especialidade: 'Clínica geral',
      jaClienteVirbac: true,
      desejaContatoComercial: false,
      origem: 'material_tecnico',
      consentimentoAceito: true,
    });
  });

  it('converte campos de texto opcionais vazios em undefined, sem enviar strings vazias à API', () => {
    const formMinimo: LeadFormData = {
      ...formCompleto,
      telefone: '',
      estadoCidade: '',
      especialidade: '',
    };

    const payload = paraLeadPayload(formMinimo);

    expect(payload.telefone).toBeUndefined();
    expect(payload.estadoCidade).toBeUndefined();
    expect(payload.especialidade).toBeUndefined();
  });
});
