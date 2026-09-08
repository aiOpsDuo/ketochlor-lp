import { z } from 'zod';
import { imageFieldSchema } from '../shared.js';

/**
 * Seção `material_tecnico`. Não inclui os campos do próprio formulário de
 * captação (nome, e-mail, CRMV etc.) — esses permanecem definidos em código
 * (`apps/lp/src/components/FormularioCTA.tsx`, tipo `LeadFormData`), conforme
 * PRD § Fora de escopo e SDD § Modelo de dados.
 */
export const materialTecnicoSchema = z.object({
  eyebrow: z.string().min(1),
  heading: z.string().min(1),
  subheading: z.string().min(1),
  ctaLabel: z.string().min(1),
  legal: z.string().min(1),
  imagemCapa: imageFieldSchema,
});

export type MaterialTecnico = z.infer<typeof materialTecnicoSchema>;

export const materialTecnicoInitialContent: MaterialTecnico = {
  eyebrow: 'ACESSO AO MATERIAL TÉCNICO',
  heading:
    'O material técnico completo sobre Ketochlor® está a um cadastro de distância.',
  subheading:
    'Indicação, mecanismo de ação e protocolo de prescrição, com acesso imediato após o cadastro.',
  ctaLabel: 'QUERO ACESSAR O MATERIAL TÉCNICO COMPLETO',
  legal: 'Cadastro rápido. Acesso imediato. Dados protegidos conforme LGPD.',
  imagemCapa: {
    url: '/assets/ketochlor-img-campanha.png',
    alt: 'Capa do Guia Técnico de Prescrição Ketochlor®',
  },
};
