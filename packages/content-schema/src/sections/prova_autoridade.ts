import { z } from 'zod';
import { imageFieldSchema } from '../shared.js';

/** Item de lista — uma estatística (SDD § Linguagem ubíqua — "Item de lista"). */
const statItemSchema = z.object({
  value: z.string().min(1),
  label: z.string().min(1),
  pct: z.number().min(0).max(100),
});

export const provaAutoridadeSchema = z.object({
  eyebrow: z.string().min(1),
  heading: z.string().min(1),
  stats: z.array(statItemSchema).min(1),
  note: z.string().min(1),
  selo: imageFieldSchema,
  ctaLabel: z.string().min(1),
});

export type ProvaAutoridade = z.infer<typeof provaAutoridadeSchema>;

export const provaAutoridadeInitialContent: ProvaAutoridade = {
  eyebrow: 'PROVA DE AUTORIDADE',
  heading: 'Resultados observados em estudo clínico Virbac',
  stats: [
    {
      value: '70%',
      label: 'dos cães com melhora clínica significativa dos sinais avaliados',
      pct: 70,
    },
    {
      value: '63%',
      label: 'redução média do prurido relatado pelos tutores',
      pct: 63,
    },
    {
      value: '100%',
      label: 'de satisfação dos tutores que testaram o produto',
      pct: 100,
    },
  ],
  note: 'Dados internos Virbac ("data on file")⁵, estudo com 41 cães. Racional científico apoiado em literatura publicada e revisada — ISCAID (2025)¹, Pershing et al. (1994)², Gupta et al. (2025)³.',
  selo: {
    url: '/assets/padrao-ouro.png',
    alt: 'Selo Padrão Ouro Virbac',
  },
  ctaLabel: 'QUERO ACESSAR O ESTUDO COMPLETO',
};
