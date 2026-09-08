import { z } from 'zod';

/**
 * Subestrutura fixa de um fenótipo da DAC (ver SDD § Linguagem ubíqua —
 * "Subestrutura fixa"). Cardinalidade fechada: `agudo` e `cronico`, nunca uma
 * lista — o painel não pode adicionar ou remover um terceiro fenótipo.
 */
const fenotipoSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  body: z.string().min(1),
  badge: z.string().min(1),
});

export const fenotiposSchema = z.object({
  eyebrow: z.string().min(1),
  heading: z.string().min(1),
  intro: z.string().min(1),
  agudo: fenotipoSchema,
  cronico: fenotipoSchema,
  closing: z.string().min(1),
});

export type Fenotipos = z.infer<typeof fenotiposSchema>;

export const fenotiposInitialContent: Fenotipos = {
  eyebrow: 'FENÓTIPOS DA DAC',
  heading: 'Nem todo caso de DAC pede a mesma resposta',
  intro:
    'Pacientes atópicos não são todos iguais — e a literatura confirma o que a clínica já mostra. Segundo Ferreira et al. (2023)⁶, os fenótipos da DAC variam conforme as interleucinas produzidas e a fase da doença:',
  agudo: {
    title: 'Paciente agudo',
    subtitle: 'Resposta Th2',
    body: 'Pele eritematosa, prurido intenso, maior ocorrência de foliculite bacteriana superficial.',
    badge: 'HEXADENE INDICADO',
  },
  cronico: {
    title: 'Paciente crônico',
    subtitle: 'Resposta Th1 + Th2',
    body: 'Hiperqueratose, hiperpigmentação, infecções recorrentes com supercrescimento bacteriano (BOG) e de Malassezia spp. (MOG) — a Malasseziose.',
    badge: 'KETOCHLOR® INDICADO',
  },
  closing:
    'Ketochlor® foi indicado para o paciente crônico, com infecção recorrente por BOG e MOG⁶ — o caso em que a resposta precisa ser dupla, e não apenas antisséptica ou apenas antifúngica.',
};
