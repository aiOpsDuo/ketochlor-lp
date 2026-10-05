import { POLITICA_PRIVACIDADE_URL } from '@ketochlor/content-schema';
import { describe, expect, it } from 'vitest';
import type { LeadParaRegistro, LeadPersistido, LeadsRepository } from '../../domain';
import { RegistrarLeadUseCase, type RegistrarLeadInput } from './registrar-lead.use-case';

/**
 * Repositório falso (em memória), só para este teste de unidade: guarda o que
 * `criar` recebeu, para provar o que a Aplicação de fato repassa à
 * Infraestrutura. O caminho real contra o MySQL do compose é coberto por
 * `leads.e2e.test.ts` e `infrastructure/mysql/leads.repository.test.ts`.
 */
class LeadsRepositoryFalso implements LeadsRepository {
  recebidos: LeadParaRegistro[] = [];

  async criar(lead: LeadParaRegistro): Promise<LeadPersistido> {
    this.recebidos.push(lead);
    return {
      id: 'lead-falso',
      nome: lead.nome,
      email: lead.email,
      telefone: lead.telefone ?? null,
      crmv: lead.crmv ?? null,
      estadoCidade: lead.estadoCidade ?? null,
      especialidade: lead.especialidade ?? null,
      jaClienteVirbac: lead.jaClienteVirbac ?? false,
      desejaContatoComercial: lead.desejaContatoComercial ?? false,
      origem: lead.origem ?? null,
      createdAt: '2026-10-02T12:00:00.000Z',
      consentimentoAceito: lead.consentimentoAceito,
      consentimentoEm: '2026-10-02T12:00:00.000Z',
      consentimentoTexto: lead.consentimentoTexto,
      consentimentoPoliticaUrl: lead.consentimentoPoliticaUrl,
    };
  }

  async listar(): Promise<LeadPersistido[]> {
    return [];
  }

  async excluir(): Promise<boolean> {
    return false;
  }
}

const INPUT_VALIDO: RegistrarLeadInput = {
  nome: 'Dra. Ana Souza',
  email: 'ana.souza@example.com',
  consentimentoAceito: true,
  consentimentoTexto: 'Li e aceito a política de privacidade (LGPD)',
};

describe('RegistrarLeadUseCase', () => {
  it('repassa ao repositório o aceite, o texto exibido e a URL da política vinda de @ketochlor/content-schema', async () => {
    const repositorio = new LeadsRepositoryFalso();
    const resultado = await new RegistrarLeadUseCase(repositorio).executar(INPUT_VALIDO);

    expect(resultado.sucesso).toBe(true);
    expect(repositorio.recebidos).toHaveLength(1);
    expect(repositorio.recebidos[0]).toMatchObject({
      consentimentoAceito: true,
      consentimentoTexto: 'Li e aceito a política de privacidade (LGPD)',
      consentimentoPoliticaUrl: POLITICA_PRIVACIDADE_URL,
    });
  });

  it('ignora uma URL de política enviada no corpo — o valor gravado é sempre o do servidor', async () => {
    const repositorio = new LeadsRepositoryFalso();
    const inputComUrlDoCliente = {
      ...INPUT_VALIDO,
      consentimentoPoliticaUrl: 'https://malicioso.example.com/politica',
    } as RegistrarLeadInput;

    await new RegistrarLeadUseCase(repositorio).executar(inputComUrlDoCliente);

    expect(repositorio.recebidos[0].consentimentoPoliticaUrl).toBe(POLITICA_PRIVACIDADE_URL);
  });

  it('não chama o repositório quando o consentimento não é estritamente true', async () => {
    const repositorio = new LeadsRepositoryFalso();
    const resultado = await new RegistrarLeadUseCase(repositorio).executar({
      ...INPUT_VALIDO,
      consentimentoAceito: false,
    });

    expect(resultado.sucesso).toBe(false);
    expect(repositorio.recebidos).toHaveLength(0);
  });
});
