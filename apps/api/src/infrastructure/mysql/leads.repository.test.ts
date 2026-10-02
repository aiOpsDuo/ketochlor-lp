import { randomUUID } from 'node:crypto';
import type { Pool, RowDataPacket } from 'mysql2/promise';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { criarMysqlPool } from './mysql-client.factory';
import { MySqlLeadsRepository } from './leads.repository';
import { carregarMysqlTestEnv } from '../test-support/mysql-test-env';
import type { LeadParaRegistro } from '../../domain/portas/leads.repository';

describe('MySqlLeadsRepository (infra)', () => {
  let pool: Pool;
  let repositorio: MySqlLeadsRepository;

  beforeAll(() => {
    // Timeout maior que o default do vitest (5s) — teste de INTEGRAÇÃO real
    // contra um MySQL de verdade, ver comentário equivalente em
    // `content-sections.repository.test.ts`.
    vi.setConfig({ testTimeout: 20_000 });
    pool = criarMysqlPool(carregarMysqlTestEnv());
    repositorio = new MySqlLeadsRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  function leadDeTeste(overrides: Partial<LeadParaRegistro> = {}): LeadParaRegistro {
    return {
      nome: 'Dra. Maria Teste',
      email: `maria.teste.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`,
      telefone: '11999999999',
      crmv: 'CRMV-SP 12345',
      estadoCidade: 'São Paulo/SP',
      especialidade: 'Dermatologia',
      jaClienteVirbac: true,
      desejaContatoComercial: false,
      origem: 'teste-integracao-mysql',
      consentimentoAceito: true,
      consentimentoTexto: 'Li e aceito a política de privacidade (LGPD)',
      consentimentoPoliticaUrl: 'https://br.virbac.com/home/legal-notice.html',
      ...overrides,
    };
  }

  it('cria um lead e o devolve com id e createdAt', async () => {
    const lead = await repositorio.criar(leadDeTeste());
    expect(lead.id).toBeTruthy();
    expect(lead.createdAt).toBeTruthy();
    expect(lead.nome).toBe('Dra. Maria Teste');
    expect(lead.jaClienteVirbac).toBe(true);
    expect(lead.desejaContatoComercial).toBe(false);

    await repositorio.excluir(lead.id);
  });

  it('grava o registro do consentimento com consentimentoEm = createdAt (relógio do servidor)', async () => {
    const lead = await repositorio.criar(leadDeTeste());

    expect(lead.consentimentoAceito).toBe(true);
    expect(lead.consentimentoEm).toBe(lead.createdAt);
    expect(lead.consentimentoTexto).toBe('Li e aceito a política de privacidade (LGPD)');
    expect(lead.consentimentoPoliticaUrl).toBe('https://br.virbac.com/home/legal-notice.html');

    // Confirma no próprio banco, não só no objeto devolvido.
    const [linhas] = await pool.execute<RowDataPacket[]>(
      'SELECT consentimento_aceito, consentimento_em, created_at, consentimento_texto, consentimento_politica_url FROM leads WHERE id = ?',
      [lead.id],
    );
    expect(linhas[0]).toMatchObject({
      consentimento_aceito: 1,
      consentimento_texto: 'Li e aceito a política de privacidade (LGPD)',
      consentimento_politica_url: 'https://br.virbac.com/home/legal-notice.html',
    });
    expect(linhas[0].consentimento_em).toBe(linhas[0].created_at);

    await repositorio.excluir(lead.id);
  });

  it('grava consentimento_texto NULL quando o texto não foi enviado', async () => {
    const lead = await repositorio.criar(leadDeTeste({ consentimentoTexto: null }));

    expect(lead.consentimentoTexto).toBeNull();

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
    const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    const agora = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute('UPDATE leads SET created_at = ? WHERE id = ?', [umDiaAtras, antigo.id]);
    await pool.execute('UPDATE leads SET created_at = ? WHERE id = ?', [agora, recente.id]);

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

  it('excluir devolve true para um id existente e false para um id inexistente', async () => {
    const lead = await repositorio.criar(leadDeTeste());

    await expect(repositorio.excluir(lead.id)).resolves.toBe(true);
    await expect(repositorio.excluir(lead.id)).resolves.toBe(false);
    await expect(repositorio.excluir(randomUUID())).resolves.toBe(false);
  });
});
