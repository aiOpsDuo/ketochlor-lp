import { z } from 'zod';
import { imageFieldSchema } from '../shared.js';

export const problemaSchema = z.object({
  eyebrow: z.string().min(1),
  heading: z.string().min(1),
  paragraphs: z.array(z.string().min(1)).min(1),
  imagem: imageFieldSchema,
});

export type Problema = z.infer<typeof problemaSchema>;

export const problemaInitialContent: Problema = {
  eyebrow: 'O PROBLEMA',
  heading: 'O ciclo que se repete',
  paragraphs: [
    'A Dermatite Atópica Canina (DAC) raramente aparece sozinha. A ruptura da barreira cutânea e outras alterações fisiológicas, levam à disbiose abrindo espaço para infecções secundárias – bacterianas e fúngicas – que se retroalimentam com o prurido e a inflamação de base.',
    'O resultado, na prática clínica, é um ciclo recorrente: o tutor trata a crise, os sinais melhoram, e semanas depois o quadro retorna, muitas vezes mais intenso.',
    'Romper esse ciclo exige controlar as duas frentes de infecção secundária ao mesmo tempo, e não apenas uma delas.',
  ],
  imagem: {
    url: '/assets/cachorro-cocando2.jpg',
    alt: 'Cão apresentando prurido, sinal clínico de infecção secundária associada à DAC',
  },
};
