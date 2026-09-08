import { CONTENT_SECTIONS } from '@ketochlor/content-schema';
import { describe, expect, it } from 'vitest';
import { ChaveSecaoInvalidaError } from './chave-secao-invalida.error';
import { ehChaveDeSecao, validarConteudoSecao } from './validar-conteudo-secao';

describe('validarConteudoSecao', () => {
  it('aceita o data válido de uma seção real (conteúdo inicial de @ketochlor/content-schema)', () => {
    const resultado = validarConteudoSecao(
      'faq',
      CONTENT_SECTIONS.faq.initialContent,
    );

    expect(resultado.sucesso).toBe(true);
    if (resultado.sucesso) {
      expect(resultado.dado).toEqual(CONTENT_SECTIONS.faq.initialContent);
    }
  });

  it('rejeita um data inválido da seção, com lista de erros', () => {
    const { perguntas: _perguntas, ...faqSemPerguntas } =
      CONTENT_SECTIONS.faq.initialContent;

    const resultado = validarConteudoSecao('faq', faqSemPerguntas);

    expect(resultado.sucesso).toBe(false);
    if (!resultado.sucesso) {
      expect(resultado.erros.length).toBeGreaterThan(0);
      expect(resultado.erros.some((erro) => erro.campo.includes('perguntas'))).toBe(
        true,
      );
    }
  });

  it('rejeita um data que não bate com o schema da seção (tipo errado)', () => {
    const resultado = validarConteudoSecao('protocolo', {
      ...CONTENT_SECTIONS.protocolo.initialContent,
      dosagem: [{ peso: '< 4,99' }], // falta volumeMl
    });

    expect(resultado.sucesso).toBe(false);
  });

  it('rejeita (erro de domínio) um key que não é uma das 11 seções fechadas', () => {
    expect(() => validarConteudoSecao('secao_inexistente', {})).toThrow(
      ChaveSecaoInvalidaError,
    );
  });

  it('ehChaveDeSecao distingue as 11 chaves fechadas de qualquer outra string', () => {
    expect(ehChaveDeSecao('faq')).toBe(true);
    expect(ehChaveDeSecao('hero')).toBe(true);
    expect(ehChaveDeSecao('nao_existe')).toBe(false);
  });
});
