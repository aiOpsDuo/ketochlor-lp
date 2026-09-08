import { z } from 'zod';

/**
 * Subestrutura fixa de coluna de ativo (ver SDD § Linguagem ubíqua —
 * "Subestrutura fixa"). Cardinalidade fechada: `cetoconazol` e `clorexidina`,
 * nunca uma lista — o painel não pode adicionar ou remover uma terceira
 * coluna.
 */
const colunaAtivoSchema = z.object({
  titulo: z.string().min(1),
  subtitulo: z.string().min(1),
  corpo: z.string().min(1),
});

export const mecanismoSchema = z.object({
  eyebrow: z.string().min(1),
  heading: z.string().min(1),
  intro: z.string().min(1),
  cetoconazol: colunaAtivoSchema,
  clorexidina: colunaAtivoSchema,
  closing: z.string().min(1),
});

export type Mecanismo = z.infer<typeof mecanismoSchema>;

export const mecanismoInitialContent: Mecanismo = {
  eyebrow: 'MECANISMO DE AÇÃO',
  heading: 'A dupla ação, na concentração que a ciência recomenda',
  intro:
    'Ketochlor® é indicado para o tratamento dos sinais clínicos relacionados às infecções secundárias associadas à DAC, promovendo a redução do prurido e da gravidade das lesões — principalmente nos casos agravados pela hiperproliferação de fungos e bactérias sensíveis à Clorexidina e ao Cetoconazol.',
  cetoconazol: {
    titulo: 'Cetoconazol 1%',
    subtitulo: 'Ação antifúngica superior',
    corpo:
      'Penetração 7 a 14 vezes superior à do miconazol no estrato córneo². Alta afinidade pela queratina garante efeito residual prolongado e previne a recolonização². Maior espectro de ação antifúngica in vitro³.',
  },
  clorexidina: {
    titulo: 'Clorexidina 2,3%',
    subtitulo: 'Controle bacteriano decisivo',
    corpo:
      'De acordo com o ISCAID (2025), a clorexidina em concentrações de 2% a 4% deve ser a principal escolha terapêutica tópica para cães¹. Ketochlor® foi formulado com a concentração ideal¹ em associação com antifúngico.',
  },
  closing: 'Dois ativos. Uma diretriz internacional como validador.',
};
