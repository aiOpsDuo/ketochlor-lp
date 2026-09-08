import { z } from 'zod';
import { imageFieldSchema } from '../shared.js';

export const tecnologiaSisSchema = z.object({
  eyebrow: z.string().min(1),
  heading: z.string().min(1),
  body: z.string().min(1),
  imagem: imageFieldSchema,
});

export type TecnologiaSis = z.infer<typeof tecnologiaSisSchema>;

export const tecnologiaSisInitialContent: TecnologiaSis = {
  eyebrow: 'TECNOLOGIA EXCLUSIVA VIRBAC',
  heading: 'Tecnologia exclusiva SIS: além da ação antimicrobiana',
  body: 'Ketochlor® é o único do mercado com a tecnologia exclusiva SIS — Skin Innovative Science™, a junção de duas tecnologias proprietárias Virbac: Glyco® e Defensin®⁴. Combinadas, elas auxiliam o equilíbrio do microbioma cutâneo e apoiam a manutenção de uma pele saudável — reforço que vai além do controle antifúngico e bacteriano, relevante especialmente para o paciente atópico, cuja barreira cutânea já está comprometida.',
  imagem: {
    url: '/assets/anatomia-da-pele.png',
    alt: 'Ilustração técnica das camadas da pele e folículo piloso',
  },
};
