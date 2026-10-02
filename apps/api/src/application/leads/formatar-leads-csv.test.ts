import { describe, expect, it } from 'vitest';
import type { LeadPersistido } from '../../domain';
import { formatarLeadsParaCsv } from './formatar-leads-csv';

function lead(overrides: Partial<LeadPersistido> = {}): LeadPersistido {
  return {
    id: 'id-1',
    nome: 'Dra. Ana Souza',
    email: 'ana.souza@example.com',
    telefone: null,
    crmv: 'SP-12345',
    estadoCidade: null,
    especialidade: null,
    jaClienteVirbac: true,
    desejaContatoComercial: false,
    origem: 'material_tecnico',
    createdAt: '2026-10-02T12:00:00.000Z',
    consentimentoAceito: true,
    consentimentoEm: '2026-10-02T12:00:00.000Z',
    consentimentoTexto: 'Li e aceito a política de privacidade (LGPD)',
    consentimentoPoliticaUrl: 'https://br.virbac.com/home/legal-notice.html',
    ...overrides,
  };
}

describe('formatarLeadsParaCsv', () => {
  it('inclui as 4 colunas de consentimento no fim do cabeçalho e de cada linha', () => {
    const [cabecalho, linha] = formatarLeadsParaCsv([lead()]).trim().split('\r\n');

    expect(cabecalho).toBe(
      'id,nome,email,telefone,crmv,estadoCidade,especialidade,jaClienteVirbac,desejaContatoComercial,origem,createdAt,consentimentoAceito,consentimentoEm,consentimentoTexto,consentimentoPoliticaUrl',
    );
    expect(linha).toBe(
      'id-1,Dra. Ana Souza,ana.souza@example.com,,SP-12345,,,true,false,material_tecnico,2026-10-02T12:00:00.000Z,true,2026-10-02T12:00:00.000Z,Li e aceito a política de privacidade (LGPD),https://br.virbac.com/home/legal-notice.html',
    );
  });

  it('deixa texto/URL de consentimento vazios para um lead legado (null) e escapa vírgula/aspas no texto', () => {
    const csv = formatarLeadsParaCsv([
      lead({ id: 'legado', consentimentoTexto: null, consentimentoPoliticaUrl: null }),
      lead({ id: 'com-virgula', consentimentoTexto: 'Li, e aceito a "política"' }),
    ]);
    const [, legado, comVirgula] = csv.trim().split('\r\n');

    expect(legado.endsWith(',true,2026-10-02T12:00:00.000Z,,')).toBe(true);
    expect(comVirgula).toContain(',"Li, e aceito a ""política""",');
  });
});
