import { z } from 'zod';

/** Item de lista — uma pergunta do FAQ. */
const perguntaSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

export const faqSchema = z.object({
  eyebrow: z.string().min(1),
  heading: z.string().min(1),
  perguntas: z.array(perguntaSchema).min(1),
});

export type Faq = z.infer<typeof faqSchema>;

/**
 * `eyebrow`/`heading` não vinham de `content.ts` (o array `FAQS` de lá é só a
 * lista de perguntas) — hoje são texto fixo dentro de
 * `apps/lp/src/components/FAQ.tsx` ("FAQ TÉCNICO" / "Perguntas frequentes").
 * Migrados aqui literalmente para fechar a seção com a mesma forma das
 * outras 10 (eyebrow + heading), conforme a tabela normativa do SDD
 * (§ Modelo de dados: "Eyebrow (se aplicável), lista de perguntas"). A
 * tarefa `lp/migrar-secoes-para-cms` troca o texto hardcoded do componente
 * por esses dois campos.
 */
export const faqInitialContent: Faq = {
  eyebrow: 'FAQ TÉCNICO',
  heading: 'Perguntas frequentes',
  perguntas: [
    {
      question: 'Ketochlor deve ser usado de forma contínua em cães com DAC?',
      answer:
        'Não. A recomendação da literatura é que, após o tratamento das infecções secundárias por 4 a 5 semanas, o paciente passe a usar um shampoo hidratante de forma contínua (como Allermyl®), retornando ao uso do Ketochlor somente se houver recidiva do processo infeccioso.',
    },
    {
      question: 'Ketochlor® substitui o tratamento sistêmico da DAC?',
      answer:
        'Em geral, não. Nos casos de Dermatite Atópica, o tratamento tópico faz parte de um conjunto de cuidados necessários para reduzir recidivas e manter a qualidade de vida do paciente, aliado ao tratamento sistêmico, controle de ectoparasitas, mudanças na dieta, entre outros.',
    },
    {
      question:
        'Qual a diferença entre usar Ketochlor® e o Hexadene Spherulites®?',
      answer:
        'Enquanto Ketochlor possui uma combinação de 2 ingredientes (Clorexidina e Cetoconazol), sendo indicado em casos mais crônicos, em geral relacionados à Dermatite Atópica, o Hexadene é uma solução única (Clorexidina 3%), mais indicado em casos primários, mais simples ou casos agudos de piodermite.',
    },
    {
      question:
        'Por que a estabilidade de 12 meses após aberto importa clinicamente?',
      answer:
        'Garante que o produto mantenha eficácia ao longo do tratamento e retratamentos, sem perda por degradação — reduzindo desperdício.',
    },
  ],
};
