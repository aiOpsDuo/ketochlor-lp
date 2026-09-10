import { describe, expect, it } from 'vitest';
import { type SiteMetadataPayloadBruto, validarSiteMetadata } from './validar-site-metadata';

const payloadValido: SiteMetadataPayloadBruto = {
  title: 'Ketochlor® — Cetoconazol + Clorexidina',
  description: 'Antisséptico tópico veterinário para dermatites bacterianas e fúngicas.',
  ogImageUrl: null,
};

describe('validarSiteMetadata', () => {
  it('aceita um payload válido com ogImageUrl nulo', () => {
    const resultado = validarSiteMetadata(payloadValido);

    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.dado).toEqual(payloadValido);
    }
  });

  it('aceita um payload válido com ogImageUrl como URL http(s)', () => {
    const resultado = validarSiteMetadata({
      ...payloadValido,
      ogImageUrl: 'https://exemplo.com/imagem-social.png',
    });

    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.dado.ogImageUrl).toBe('https://exemplo.com/imagem-social.png');
    }
  });

  it('trata ogImageUrl vazio/só espaços como nulo (remove a imagem)', () => {
    const resultado = validarSiteMetadata({ ...payloadValido, ogImageUrl: '   ' });

    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.dado.ogImageUrl).toBeNull();
    }
  });

  it('rejeita um ogImageUrl que não é uma URL http(s) válida', () => {
    const resultado = validarSiteMetadata({ ...payloadValido, ogImageUrl: 'media-id-123' });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.some((erro) => erro.campo === 'ogImageUrl')).toBe(true);
    }
  });

  it.each(['ftp://exemplo.com/img.png', '/relativo.png', 'exemplo.com/img.png'])(
    'rejeita formato de URL não http(s): %s',
    (valor) => {
      const resultado = validarSiteMetadata({ ...payloadValido, ogImageUrl: valor });

      expect(resultado.sucesso).toBe(false);
    },
  );

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

  it('rejeita um ogImageUrl que não é string nem nulo', () => {
    const resultado = validarSiteMetadata({
      ...payloadValido,
      ogImageUrl: 123 as unknown as string,
    });

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.some((erro) => erro.campo === 'ogImageUrl')).toBe(true);
    }
  });

  it('trata ogImageUrl ausente (undefined) como nulo', () => {
    const { ogImageUrl: _ogImageUrl, ...semImagem } = payloadValido;
    const resultado = validarSiteMetadata(semImagem as unknown as SiteMetadataPayloadBruto);

    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.dado.ogImageUrl).toBeNull();
    }
  });
});
