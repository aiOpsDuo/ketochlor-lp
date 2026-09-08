import { z } from 'zod';

export const ctaSecundarioSchema = z.object({
  heading: z.string().min(1),
  body: z.string().min(1),
  ctaLabel: z.string().min(1),
});

export type CtaSecundario = z.infer<typeof ctaSecundarioSchema>;

export const ctaSecundarioInitialContent: CtaSecundario = {
  heading: 'Prefere conversar diretamente com a equipe Virbac?',
  body: 'Deseja receber contato ou visita da equipe comercial? Marque essa opção no formulário acima.',
  ctaLabel: 'SOLICITAR CONTATO',
};
