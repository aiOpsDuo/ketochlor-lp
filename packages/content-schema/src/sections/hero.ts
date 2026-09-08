import { z } from 'zod';
import { imageFieldSchema } from '../shared.js';

/**
 * Seção `hero`. Campos de texto de abertura da LP + as três imagens que a
 * seção usa hoje em `apps/lp/src/components/Hero.tsx`: `logo` e
 * `imagemCampanha` estão de fato renderizadas; `selo` é migrada porque o SDD
 * (§ Modelo de dados) já normatiza a forma de `hero` com essa terceira
 * imagem — hoje ela existe em `Hero.tsx` como um bloco `<img>` comentado
 * (não removido, só desativado visualmente). Ver nota de decisão no PR desta
 * tarefa.
 */
export const heroSchema = z.object({
  eyebrow: z.string().min(1),
  heading: z.string().min(1),
  subheading: z.string().min(1),
  ctaLabel: z.string().min(1),
  logo: imageFieldSchema,
  imagemCampanha: imageFieldSchema,
  selo: imageFieldSchema,
});

export type Hero = z.infer<typeof heroSchema>;

export const heroInitialContent: Hero = {
  eyebrow: 'CIÊNCIA QUE ACOLHE, CUIDADO QUE RESOLVE',
  heading: 'Prepare-se para a evolução da terapia tópica.',
  subheading:
    'A concentração ideal de clorexidina recomendada pela diretriz ICAID (2025), associada ao Cetoconazol e tecnologia exclusiva de suporte ao microbioma cutâneo.',
  ctaLabel: 'QUERO ACESSAR O MATERIAL TÉCNICO COMPLETO',
  logo: {
    url: '/assets/logo-ketochlor-transp.png',
    alt: 'Ketochlor®',
  },
  imagemCampanha: {
    url: '/assets/ketochlor-img-campanha.png',
    alt: 'Linha Ketochlor® — shampoos terapêuticos Virbac',
  },
  selo: {
    url: '/assets/padrao-ouro.png',
    alt: 'Selo Padrão Ouro Virbac',
  },
};
