import { z } from 'zod';

/** Item de lista — um item comparativo da síntese de diferenciais. */
const itemComparativoSchema = z.object({
  titulo: z.string().min(1),
  corpo: z.string().min(1),
});

export const diferenciaisSchema = z.object({
  eyebrow: z.string().min(1),
  heading: z.string().min(1),
  items: z.array(itemComparativoSchema).min(1),
});

export type Diferenciais = z.infer<typeof diferenciaisSchema>;

export const diferenciaisInitialContent: Diferenciais = {
  eyebrow: 'SÍNTESE COMPARATIVA',
  heading: 'Por que Ketochlor®, em síntese',
  items: [
    {
      titulo: 'Eficácia antifúngica superior',
      corpo:
        'Cetoconazol com 7-14x mais penetração no estrato córneo e efeito residual prolongado²',
    },
    {
      titulo: 'Potência antisséptica otimizada',
      corpo:
        '2,3% de Clorexidina, dentro da concentração recomendada pelo ISCAID¹',
    },
    {
      titulo: 'Tecnologia exclusiva SIS',
      corpo:
        'Estimula as defesas naturais da pele – essencial para o paciente atópico⁴',
    },
    {
      titulo: 'Estabilidade incomparável',
      corpo:
        'Único com 12 meses de validade em uso – tratamento completo, sem desperdício',
    },
  ],
};
