import { describe, expect, it } from 'vitest';
import {
  type SolicitacaoUploadBruta,
  validarSolicitacaoUpload,
} from './validar-solicitacao-upload';

const payloadValido: SolicitacaoUploadBruta = {
  originalFilename: 'selo-eficacia.png',
  mimeType: 'image/png',
};

describe('validarSolicitacaoUpload', () => {
  it('aceita um payload válido', () => {
    const resultado = validarSolicitacaoUpload(payloadValido);

    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.dado).toEqual(payloadValido);
    }
  });

  it('aceita qualquer subtipo de imagem (ex.: image/jpeg, image/webp)', () => {
    expect(
      validarSolicitacaoUpload({ ...payloadValido, mimeType: 'image/jpeg' }).sucesso,
    ).toBe(true);
    expect(
      validarSolicitacaoUpload({ ...payloadValido, mimeType: 'image/webp' }).sucesso,
    ).toBe(true);
  });

  it('rejeita originalFilename vazio', () => {
    const resultado = validarSolicitacaoUpload({ ...payloadValido, originalFilename: '' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.some((erro) => erro.campo === 'originalFilename')).toBe(true);
    }
  });

  it('rejeita originalFilename só de espaços em branco', () => {
    const resultado = validarSolicitacaoUpload({ ...payloadValido, originalFilename: '   ' });

    expect(resultado.sucesso).toBe(false);
  });

  it('rejeita mimeType vazio', () => {
    const resultado = validarSolicitacaoUpload({ ...payloadValido, mimeType: '' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.some((erro) => erro.campo === 'mimeType')).toBe(true);
    }
  });

  it('rejeita mimeType que não começa com "image/" (ex.: vídeo, não suportado nesta versão)', () => {
    const resultado = validarSolicitacaoUpload({ ...payloadValido, mimeType: 'video/mp4' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.some((erro) => erro.campo === 'mimeType')).toBe(true);
    }
  });

  it('acumula os dois erros quando originalFilename e mimeType estão vazios', () => {
    const resultado = validarSolicitacaoUpload({ originalFilename: '', mimeType: '' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros).toHaveLength(2);
    }
  });
});
