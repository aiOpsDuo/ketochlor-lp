import { describe, expect, it } from 'vitest';
import {
  type LeadPayloadBruto,
  TAMANHO_MAXIMO_TEXTO_CONSENTIMENTO,
  validarLead,
} from './validar-lead';

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
  consentimentoTexto: 'Li e aceito a política de privacidade (LGPD)',
};

describe('validarLead', () => {
  it('aceita um payload válido com consentimento e devolve o registro do aceite no dado validado', () => {
    const resultado = validarLead(payloadValido);

    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.dado.nome).toBe(payloadValido.nome);
      expect(resultado.dado.email).toBe(payloadValido.email);
      expect(resultado.dado.consentimentoAceito).toBe(true);
      expect(resultado.dado.consentimentoTexto).toBe(
        'Li e aceito a política de privacidade (LGPD)',
      );
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

  it('aceita um payload sem consentimentoTexto e devolve consentimentoTexto null', () => {
    const { consentimentoTexto: _texto, ...semTexto } = payloadValido;
    const resultado = validarLead(semTexto);

    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.dado.consentimentoTexto).toBeNull();
    }
  });

  it('aplica trim em consentimentoTexto e trata texto só de espaços como ausente (null)', () => {
    const comEspacos = validarLead({ ...payloadValido, consentimentoTexto: '  Li e aceito  ' });
    const soEspacos = validarLead({ ...payloadValido, consentimentoTexto: '   ' });

    expect(comEspacos.sucesso && comEspacos.dado.consentimentoTexto).toBe('Li e aceito');
    expect(soEspacos.sucesso && soEspacos.dado.consentimentoTexto).toBeNull();
  });

  it('aceita consentimentoTexto com exatamente o tamanho máximo e rejeita um caractere a mais', () => {
    const noLimite = validarLead({
      ...payloadValido,
      consentimentoTexto: 'a'.repeat(TAMANHO_MAXIMO_TEXTO_CONSENTIMENTO),
    });
    const acimaDoLimite = validarLead({
      ...payloadValido,
      consentimentoTexto: 'a'.repeat(TAMANHO_MAXIMO_TEXTO_CONSENTIMENTO + 1),
    });

    expect(noLimite.sucesso).toBe(true);
    expect(acimaDoLimite.sucesso).toBe(false);
    if (!acimaDoLimite.sucesso) {
      expect(acimaDoLimite.erros).toEqual([
        expect.objectContaining({ campo: 'consentimentoTexto' }),
      ]);
    }
  });

  it.each([123, true, null, { texto: 'x' }])(
    'rejeita consentimentoTexto que não é string (%j)',
    (valorInvalido) => {
      const resultado = validarLead({
        ...payloadValido,
        consentimentoTexto: valorInvalido as unknown as string,
      });

      expect(resultado.sucesso).toBe(false);
      if (!resultado.sucesso) {
        expect(resultado.erros.some((erro) => erro.campo === 'consentimentoTexto')).toBe(true);
      }
    },
  );
});
