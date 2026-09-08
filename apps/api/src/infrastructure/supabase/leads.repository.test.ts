import { beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { criarSupabaseAdminClient } from './supabase-client.factory';
import { SupabaseLeadsRepository } from './leads.repository';
import { carregarSupabaseTestEnv } from '../test-support/supabase-test-env';
import type { LeadValidado } from '../../domain/leads/validar-lead';

describe('SupabaseLeadsRepository (infra)', () => {
  let client: SupabaseClient;
  let repositorio: SupabaseLeadsRepository;

  beforeAll(() => {
    client = criarSupabaseAdminClient(carregarSupabaseTestEnv());
    repositorio = new SupabaseLeadsRepository(client);
  });

  function leadDeTeste(overrides: Partial<LeadValidado> = {}): LeadValidado {
    return {
      nome: 'Dra. Maria Teste',
      email: `maria.teste.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
      telefone: '11999999999',
      crmv: 'CRMV-SP 12345',
      estadoCidade: 'São Paulo/SP',
      especialidade: 'Dermatologia',
      jaClienteVirbac: true,
      desejaContatoComercial: false,
      origem: 'teste-integracao',
      ...overrides,
    };
  }

  it('cria um lead e o devolve com id e createdAt', async () => {
    const lead = await repositorio.criar(leadDeTeste());
    expect(lead.id).toBeTruthy();
    expect(lead.createdAt).toBeTruthy();
    expect(lead.nome).toBe('Dra. Maria Teste');

    await repositorio.excluir(lead.id);
  });

  it('lista mais recente primeiro e filtra por período', async () => {
    const antigo = await repositorio.criar(
      leadDeTeste({ nome: 'Lead Antigo', origem: 'periodo-antigo' }),
    );
    const recente = await repositorio.criar(
      leadDeTeste({ nome: 'Lead Recente', origem: 'periodo-recente' }),
    );

    // Fixa created_at do "antigo" 1 dia atrás e do "recente" para agora, para
    // o filtro de período não depender de timing de execução do teste.
    const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const agora = new Date().toISOString();
    await client.from('leads').update({ created_at: umDiaAtras }).eq('id', antigo.id);
    await client.from('leads').update({ created_at: agora }).eq('id', recente.id);

    const todos = await repositorio.listarPorPeriodo();
    const indiceAntigo = todos.findIndex((l) => l.id === antigo.id);
    const indiceRecente = todos.findIndex((l) => l.id === recente.id);
    expect(indiceRecente).toBeLessThan(indiceAntigo);

    const soRecentes = await repositorio.listarPorPeriodo({
      from: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
    expect(soRecentes.some((l) => l.id === recente.id)).toBe(true);
    expect(soRecentes.some((l) => l.id === antigo.id)).toBe(false);

    await repositorio.excluir(antigo.id);
    await repositorio.excluir(recente.id);
  });

  it('exclui um lead permanentemente', async () => {
    const lead = await repositorio.criar(leadDeTeste());
    await repositorio.excluir(lead.id);

    const todos = await repositorio.listarPorPeriodo();
    expect(todos.some((l) => l.id === lead.id)).toBe(false);
  });
});
