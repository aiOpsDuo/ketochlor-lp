import { z } from 'zod';

/** Item de lista — uma linha da tabela de dosagem (peso × volume). */
const dosagemRowSchema = z.object({
  peso: z.string().min(1),
  volumeMl: z.string().min(1),
});

const protocoloClosingSchema = z.object({
  product: z.string().min(1),
  highlight: z.string().min(1),
  text: z.string().min(1),
});

export const protocoloSchema = z.object({
  eyebrow: z.string().min(1),
  heading: z.string().min(1),
  modoUso: z.string().min(1),
  estabilidadeBadge: z.string().min(1),
  closing: protocoloClosingSchema,
  dosagem: z.array(dosagemRowSchema).min(1),
});

export type Protocolo = z.infer<typeof protocoloSchema>;

export const protocoloInitialContent: Protocolo = {
  eyebrow: 'PROTOCOLO DE USO',
  heading: 'Protocolo simples de prescrever',
  modoUso:
    'Aplicar duas vezes por semana. Massagear e deixar o produto agir na pelagem por 10 minutos antes de enxaguar. Duração do tratamento: 5 semanas, ou a critério do médico-veterinário.',
  estabilidadeBadge: '12 MESES DE ESTABILIDADE',
  closing: {
    product: 'Ketochlor®',
    highlight: 'é o único do mercado com estabilidade de 12 meses após aberto',
    text: 'Permitindo o tratamento completo, sem interrupção por perda de eficácia e sem desperdício para o tutor.',
  },
  dosagem: [
    { peso: '< 4,99', volumeMl: '10' },
    { peso: '5 – 10,99', volumeMl: '15' },
    { peso: '11 – 15,99', volumeMl: '20' },
    { peso: '16 – 20,99', volumeMl: '25' },
    { peso: '21 – 30,99', volumeMl: '30' },
    { peso: '31 – 45,99', volumeMl: '40' },
    { peso: '> 46', volumeMl: '50' },
  ],
};
