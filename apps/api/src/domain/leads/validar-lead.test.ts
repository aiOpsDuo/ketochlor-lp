import { describe, expect, it } from 'vitest';
import { type LeadPayloadBruto, validarLead } from './validar-lead';

const payloadValido: LeadPayloadBruto = {
  nome: 'Dra. Ana Souza',
  email: 'ana.souza@example.com',
  telefone: '11999999999',
  crmv: 'SP-12345',
  estadoCidade: 'São Paulo/SP',
  especialidade: 'Dermatologia',
  jaClienteVirbac: true,
  desejaContatoComercial: false,
  origem: 'material-tecnico',
  consentimentoAceito: true,
};

describe('validarLead', () => {
  it('aceita um payload válido com consentimento e não inclui consentimentoAceito no dado retornado', () => {
    const resultado = validarLead(payloadValido);

    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.dado.nome).toBe(payloadValido.nome);
      expect(resultado.dado.email).toBe(payloadValido.email);
      expect(resultado.dado).not.toHaveProperty('consentimentoAceito');
    }
  });

  it('rejeita um payload sem nome', () => {
    const resultado = validarLead({ ...payloadValido, nome: '' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.some((erro) => erro.campo === 'nome')).toBe(true);
    }
  });

  it('rejeita um payload com nome só de espaços em branco', () => {
    const resultado = validarLead({ ...payloadValido, nome: '   ' });

    expect(resultado.sucesso).toBe(false);
  });

  it('rejeita um payload sem email', () => {
    const resultado = validarLead({ ...payloadValido, email: '' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.some((erro) => erro.campo === 'email')).toBe(true);
    }
  });

  it('rejeita um email em formato inválido', () => {
    const resultado = validarLead({ ...payloadValido, email: 'nao-e-email' });

    expect(resultado.sucesso).toBe(false);
  });

  it('rejeita (erro de domínio) mesmo com todos os demais campos válidos, se consentimentoAceito !== true', () => {
    const resultado = validarLead({ ...payloadValido, consentimentoAceito: false });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(
        resultado.erros.some((erro) => erro.campo === 'consentimentoAceito'),
      ).toBe(true);
      // as demais validações continuam ok — só o consentimento reprova
      expect(resultado.erros).toHaveLength(1);
    }
  });

  it('rejeita um payload sem consentimentoAceito no corpo (undefined)', () => {
    const { consentimentoAceito: _consentimento, ...semConsentimento } =
      payloadValido;
    const resultado = validarLead(
      semConsentimento as unknown as LeadPayloadBruto,
    );

    expect(resultado.sucesso).toBe(false);
  });
});
