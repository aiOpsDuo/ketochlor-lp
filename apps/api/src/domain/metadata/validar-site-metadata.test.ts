import { describe, expect, it } from 'vitest';
import { type SiteMetadataPayloadBruto, validarSiteMetadata } from './validar-site-metadata';

const payloadValido: SiteMetadataPayloadBruto = {
  title: 'Ketochlor® — Cetoconazol + Clorexidina',
  description: 'Antisséptico tópico veterinário para dermatites bacterianas e fúngicas.',
  ogImageMediaId: null,
};

describe('validarSiteMetadata', () => {
  it('aceita um payload válido com ogImageMediaId nulo', () => {
    const resultado = validarSiteMetadata(payloadValido);

    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.dado).toEqual(payloadValido);
    }
  });

  it('aceita um payload válido com ogImageMediaId referenciando uma mídia', () => {
    const resultado = validarSiteMetadata({ ...payloadValido, ogImageMediaId: 'media-id-123' });

    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.dado.ogImageMediaId).toBe('media-id-123');
    }
  });

  it('rejeita um title vazio', () => {
    const resultado = validarSiteMetadata({ ...payloadValido, title: '' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.some((erro) => erro.campo === 'title')).toBe(true);
    }
  });

  it('rejeita um title só de espaços em branco', () => {
    const resultado = validarSiteMetadata({ ...payloadValido, title: '   ' });

    expect(resultado.sucesso).toBe(false);
  });

  it('rejeita uma description vazia', () => {
    const resultado = validarSiteMetadata({ ...payloadValido, description: '' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.some((erro) => erro.campo === 'description')).toBe(true);
    }
  });

  it('acumula os dois erros quando title e description estão vazios', () => {
    const resultado = validarSiteMetadata({ ...payloadValido, title: '', description: '' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros).toHaveLength(2);
    }
  });

  it('rejeita um ogImageMediaId que não é string nem nulo', () => {
    const resultado = validarSiteMetadata({
      ...payloadValido,
      ogImageMediaId: 123 as unknown as string,
    });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.some((erro) => erro.campo === 'ogImageMediaId')).toBe(true);
    }
  });

  it('trata ogImageMediaId ausente (undefined) como nulo', () => {
    const { ogImageMediaId: _ogImageMediaId, ...semImagem } = payloadValido;
    const resultado = validarSiteMetadata(semImagem as unknown as SiteMetadataPayloadBruto);

    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.dado.ogImageMediaId).toBeNull();
    }
  });
});
