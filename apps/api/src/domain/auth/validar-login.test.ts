import { describe, expect, it } from 'vitest';
import { type LoginPayloadBruto, validarLogin } from './validar-login';

const payloadValido: LoginPayloadBruto = {
  email: 'ana.souza@example.com',
  senha: 'senha-valida-123',
};

describe('validarLogin', () => {
  it('aceita um payload válido', () => {
    const resultado = validarLogin(payloadValido);

    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.dado).toEqual(payloadValido);
    }
  });

  it('apara espaços de email, mas não de senha', () => {
    const resultado = validarLogin({
      email: '  ana.souza@example.com  ',
      senha: ' senha-valida-123 ',
    });

    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.dado.email).toBe('ana.souza@example.com');
      expect(resultado.dado.senha).toBe(' senha-valida-123 ');
    }
  });

  it('rejeita um payload sem email', () => {
    const resultado = validarLogin({ ...payloadValido, email: '' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.some((erro) => erro.campo === 'email')).toBe(true);
    }
  });

  it('rejeita um email em formato inválido', () => {
    const resultado = validarLogin({ ...payloadValido, email: 'nao-e-email' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.some((erro) => erro.campo === 'email')).toBe(true);
    }
  });

  it('rejeita um payload sem senha, sem impor tamanho mínimo (diferente de validarCriacaoOperador)', () => {
    const resultado = validarLogin({ ...payloadValido, senha: '' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.some((erro) => erro.campo === 'senha')).toBe(true);
    }
  });

  it('aceita uma senha curta na FORMA (a invalidez de credencial é responsabilidade do caso de uso, não do Domínio)', () => {
    const resultado = validarLogin({ ...payloadValido, senha: '123' });

    expect(resultado.sucesso).toBe(true);
  });

  it('acumula todos os erros de uma vez, quando mais de um campo é inválido', () => {
    const resultado = validarLogin({ email: '', senha: '' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      const campos = resultado.erros.map((erro) => erro.campo);
      expect(campos).toContain('email');
      expect(campos).toContain('senha');
    }
  });
});
