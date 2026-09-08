import { CONTENT_SECTIONS } from '@ketochlor/content-schema';
import { describe, expect, it } from 'vitest';
import { filtrarConteudoPublicado } from './filtrar-conteudo-publicado';

describe('filtrarConteudoPublicado', () => {
  it('devolve null quando a seção inteira não está publicada', () => {
    const resultado = filtrarConteudoPublicado({
      isPublished: false,
      data: CONTENT_SECTIONS.faq.initialContent,
    });

    expect(resultado).toBeNull();
  });

  it('sem itemVisibilityFlags, devolve o data inalterado (seção publicada)', () => {
    const resultado = filtrarConteudoPublicado({
      isPublished: true,
      data: CONTENT_SECTIONS.faq.initialContent,
    });

    expect(resultado).toEqual(CONTENT_SECTIONS.faq.initialContent);
  });

  it('remove o item não visível de uma lista e mantém os demais, na mesma ordem', () => {
    const { faq } = CONTENT_SECTIONS;
    // a segunda pergunta (índice 1) marcada como não visível
    const resultado = filtrarConteudoPublicado(
      { isPublished: true, data: faq.initialContent },
      { perguntas: [true, false, true, true] },
    );

    expect(resultado).not.toBeNull();
    expect(resultado?.perguntas).toHaveLength(3);
    expect(resultado?.perguntas.map((p) => p.question)).toEqual([
      faq.initialContent.perguntas[0].question,
      faq.initialContent.perguntas[2].question,
      faq.initialContent.perguntas[3].question,
    ]);
  });

  it('um índice ausente do array de flags é tratado como visível (default true)', () => {
    const { protocolo } = CONTENT_SECTIONS;
    const resultado = filtrarConteudoPublicado(
      { isPublished: true, data: protocolo.initialContent },
      { dosagem: [false] }, // só o índice 0 é explicitado (não visível); os demais ficam de fora do array
    );

    expect(resultado?.dosagem).toHaveLength(protocolo.initialContent.dosagem.length - 1);
    expect(resultado?.dosagem[0]).toEqual(protocolo.initialContent.dosagem[1]);
  });

  it('não mexe em campos que não são listas referenciadas no mapa de visibilidade', () => {
    const resultado = filtrarConteudoPublicado(
      { isPublished: true, data: CONTENT_SECTIONS.faq.initialContent },
      { perguntas: [false, true, true, true] },
    );

    expect(resultado?.eyebrow).toBe(CONTENT_SECTIONS.faq.initialContent.eyebrow);
    expect(resultado?.heading).toBe(CONTENT_SECTIONS.faq.initialContent.heading);
  });

  it('não modifica o objeto de data original (função pura)', () => {
    const dataOriginal = CONTENT_SECTIONS.faq.initialContent;
    const quantidadeOriginal = dataOriginal.perguntas.length;

    filtrarConteudoPublicado(
      { isPublished: true, data: dataOriginal },
      { perguntas: [false, true, true, true] },
    );

    expect(dataOriginal.perguntas.length).toBe(quantidadeOriginal);
  });
});
