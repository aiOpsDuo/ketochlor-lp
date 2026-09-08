import { describe, expect, it } from 'vitest';
import { CONTENT_SECTIONS, imageFieldSchema } from './index.js';

const SECTION_KEYS = Object.keys(CONTENT_SECTIONS) as (keyof typeof CONTENT_SECTIONS)[];

describe('CONTENT_SECTIONS', () => {
  it('declara exatamente as 11 seções fechadas do CMS (SDD § Linguagem ubíqua)', () => {
    expect(SECTION_KEYS.sort()).toEqual(
      [
        'cta_secundario',
        'diferenciais',
        'faq',
        'fenotipos',
        'hero',
        'material_tecnico',
        'mecanismo',
        'problema',
        'protocolo',
        'prova_autoridade',
        'tecnologia_sis',
      ].sort(),
    );
  });

  it.each(SECTION_KEYS)(
    'o conteúdo inicial migrado de "%s" satisfaz o próprio schema',
    (key) => {
      const { schema, initialContent } = CONTENT_SECTIONS[key];
      expect(() => schema.parse(initialContent)).not.toThrow();
    },
  );
});

describe('conteúdo migrado literalmente de apps/lp/src/data/content.ts', () => {
  it('protocolo.dosagem tem as 7 linhas de DOSAGEM, na mesma ordem', () => {
    expect(CONTENT_SECTIONS.protocolo.initialContent.dosagem).toEqual([
      { peso: '< 4,99', volumeMl: '10' },
      { peso: '5 – 10,99', volumeMl: '15' },
      { peso: '11 – 15,99', volumeMl: '20' },
      { peso: '16 – 20,99', volumeMl: '25' },
      { peso: '21 – 30,99', volumeMl: '30' },
      { peso: '31 – 45,99', volumeMl: '40' },
      { peso: '> 46', volumeMl: '50' },
    ]);
  });

  it('faq.perguntas tem as 4 perguntas de FAQS, na mesma ordem', () => {
    expect(
      CONTENT_SECTIONS.faq.initialContent.perguntas.map((p) => p.question),
    ).toEqual([
      'Ketochlor deve ser usado de forma contínua em cães com DAC?',
      'Ketochlor® substitui o tratamento sistêmico da DAC?',
      'Qual a diferença entre usar Ketochlor® e o Hexadene Spherulites®?',
      'Por que a estabilidade de 12 meses após aberto importa clinicamente?',
    ]);
  });

  it('fenotipos.agudo e fenotipos.cronico batem com FENOTIPOS de content.ts', () => {
    const { agudo, cronico } = CONTENT_SECTIONS.fenotipos.initialContent;
    expect(agudo).toEqual({
      title: 'Paciente agudo',
      subtitle: 'Resposta Th2',
      body: 'Pele eritematosa, prurido intenso, maior ocorrência de foliculite bacteriana superficial.',
      badge: 'HEXADENE INDICADO',
    });
    expect(cronico.badge).toBe('KETOCHLOR® INDICADO');
  });

  it('mecanismo.cetoconazol e mecanismo.clorexidina batem com as duas colunas de MECANISMO', () => {
    const { cetoconazol, clorexidina } = CONTENT_SECTIONS.mecanismo.initialContent;
    expect(cetoconazol.titulo).toBe('Cetoconazol 1%');
    expect(clorexidina.titulo).toBe('Clorexidina 2,3%');
  });
});

describe('imageFieldSchema', () => {
  it('aceita uma imagem com url e alt preenchidos', () => {
    const result = imageFieldSchema.safeParse({
      url: '/assets/logo-ketochlor-transp.png',
      alt: 'Ketochlor®',
    });
    expect(result.success).toBe(true);
  });

  it('rejeita uma imagem sem alt (texto alternativo é obrigatório)', () => {
    const result = imageFieldSchema.safeParse({
      url: '/assets/logo-ketochlor-transp.png',
      alt: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('validação negativa — schema não é um "any" disfarçado', () => {
  it('hero rejeita conteúdo sem a imagem obrigatória "selo"', () => {
    const { schema, initialContent } = CONTENT_SECTIONS.hero;
    const { selo: _selo, ...heroSemSelo } = initialContent;
    const result = schema.safeParse(heroSemSelo);
    expect(result.success).toBe(false);
  });

  it('prova_autoridade rejeita uma lista de stats vazia (cardinalidade variável exige ao menos 1 item)', () => {
    const { schema, initialContent } = CONTENT_SECTIONS.prova_autoridade;
    const result = schema.safeParse({ ...initialContent, stats: [] });
    expect(result.success).toBe(false);
  });

  it('protocolo rejeita uma linha de dosagem sem volumeMl', () => {
    const { schema, initialContent } = CONTENT_SECTIONS.protocolo;
    const result = schema.safeParse({
      ...initialContent,
      dosagem: [{ peso: '< 4,99' }],
    });
    expect(result.success).toBe(false);
  });

  it('faq rejeita uma pergunta sem answer', () => {
    const { schema, initialContent } = CONTENT_SECTIONS.faq;
    const result = schema.safeParse({
      ...initialContent,
      perguntas: [{ question: 'Pergunta sem resposta?' }],
    });
    expect(result.success).toBe(false);
  });

  it('cta_secundario rejeita heading vazio', () => {
    const { schema, initialContent } = CONTENT_SECTIONS.cta_secundario;
    const result = schema.safeParse({ ...initialContent, heading: '' });
    expect(result.success).toBe(false);
  });
});
