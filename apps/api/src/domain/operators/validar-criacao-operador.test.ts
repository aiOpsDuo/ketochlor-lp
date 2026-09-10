import { describe, expect, it } from 'vitest';
import { type CriarOperadorPayloadBruto, validarCriacaoOperador } from './validar-criacao-operador';

const payloadValido: CriarOperadorPayloadBruto = {
  nome: 'Ana Souza',
  email: 'ana.souza@example.com',
  senha: 'senha-valida-123',
};

describe('validarCriacaoOperador', () => {
  it('aceita um payload válido', () => {
    const resultado = validarCriacaoOperador(payloadValido);

    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.dado).toEqual(payloadValido);
    }
  });

  it('apara espaços de nome e email, mas não de senha', () => {
    const resultado = validarCriacaoOperador({
      ...payloadValido,
      nome: '  Ana Souza  ',
      email: '  ana.souza@example.com  ',
      senha: ' senha-valida-123 ',
    });

    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.dado.nome).toBe('Ana Souza');
      expect(resultado.dado.email).toBe('ana.souza@example.com');
      expect(resultado.dado.senha).toBe(' senha-valida-123 ');
    }
  });

  it('rejeita um payload sem nome', () => {
    const resultado = validarCriacaoOperador({ ...payloadValido, nome: '' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.some((erro) => erro.campo === 'nome')).toBe(true);
    }
  });

  it('rejeita um payload com nome só de espaços em branco', () => {
    const resultado = validarCriacaoOperador({ ...payloadValido, nome: '   ' });

    expect(resultado.sucesso).toBe(false);
  });

  it('rejeita um payload sem email', () => {
    const resultado = validarCriacaoOperador({ ...payloadValido, email: '' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.some((erro) => erro.campo === 'email')).toBe(true);
    }
  });

  it('rejeita um email em formato inválido', () => {
    const resultado = validarCriacaoOperador({ ...payloadValido, email: 'nao-e-email' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.some((erro) => erro.campo === 'email')).toBe(true);
    }
  });

  it('rejeita uma senha vazia', () => {
    const resultado = validarCriacaoOperador({ ...payloadValido, senha: '' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.some((erro) => erro.campo === 'senha')).toBe(true);
    }
  });

  it('rejeita uma senha com menos de 6 caracteres', () => {
    const resultado = validarCriacaoOperador({ ...payloadValido, senha: '12345' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.some((erro) => erro.campo === 'senha')).toBe(true);
    }
  });

  it('aceita uma senha com exatamente 6 caracteres', () => {
    const resultado = validarCriacaoOperador({ ...payloadValido, senha: '123456' });

    expect(resultado.sucesso).toBe(true);
  });

  it('acumula todos os erros de uma vez, quando mais de um campo é inválido', () => {
    const resultado = validarCriacaoOperador({ nome: '', email: 'invalido', senha: '123' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      const campos = resultado.erros.map((erro) => erro.campo);
      expect(campos).toContain('nome');
      expect(campos).toContain('email');
      expect(campos).toContain('senha');
    }
  });
});
