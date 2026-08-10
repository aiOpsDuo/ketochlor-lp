import type { NavItem, FaqItem, DosageRow } from "../types";

export const NAV_ITEMS: NavItem[] = [
  { label: "Início", targetId: "inicio" },
  { label: "O Problema", targetId: "problema" },
  { label: "Mecanismo", targetId: "mecanismo" },
  { label: "Tecnologia SIS", targetId: "tecnologia-sis" },
  { label: "Protocolo", targetId: "protocolo" },
  { label: "Diferenciais", targetId: "diferenciais" },
  { label: "FAQ", targetId: "faq" },
];

export const HERO = {
  eyebrow: "CIÊNCIA QUE ACOLHE, CUIDADO QUE RESOLVE",
  heading: "Prepare-se para a evolução da terapia tópica.",
  subheading:
    "A concentração ideal de clorexidina recomendada pela diretriz ICAID (2025), associada ao Cetoconazol e tecnologia exclusiva de suporte ao microbioma cutâneo.",
  ctaLabel: "QUERO ACESSAR O MATERIAL TÉCNICO COMPLETO",
};

export const PROBLEMA = {
  eyebrow: "O PROBLEMA",
  heading: "O ciclo que se repete",
  paragraphs: [
    "A Dermatite Atópica Canina (DAC) raramente aparece sozinha. A ruptura da barreira cutânea e outras alterações fisiológicas, levam à disbiose abrindo espaço para infecções. ",
    "O resultado, na prática clínica, é um ciclo recorrente: o tutor trata a crise, os sinais melhoram, e semanas depois o quadro retorna, muitas vezes mais intenso.",
    "Romper esse ciclo exige controlar as duas frentes de infecção secundária ao mesmo tempo, e não apenas uma delas.",
  ],
};

export const FENOTIPOS = {
  eyebrow: "FENÓTIPOS DA DAC",
  heading: "Nem todo caso de DAC pede a mesma resposta",
  intro:
    "Pacientes atópicos não são todos iguais — e a literatura confirma o que a clínica já mostra. Segundo Ferreira et al. (2023)⁶, os fenótipos da DAC variam conforme as interleucinas produzidas e a fase da doença:",
  agudo: {
    title: "Paciente agudo",
    subtitle: "Resposta Th2",
    body: "Pele eritematosa, prurido intenso, maior ocorrência de foliculite bacteriana superficial.",
    badge: "HEXADENE INDICADO",
  },
  cronico: {
    title: "Paciente crônico",
    subtitle: "Resposta Th1 + Th2",
    body: "Hiperqueratose, hiperpigmentação, infecções recorrentes com supercrescimento bacteriano (BOG) e de Malassezia spp. (MOG) — a Malasseziose.",
    badge: "KETOCHLOR® INDICADO",
  },
  closing:
    "Ketochlor® foi indicado para o paciente crônico, com infecção recorrente por BOG e MOG⁶ — o caso em que a resposta precisa ser dupla, e não apenas antisséptica ou apenas antifúngica.",
};

export const MECANISMO = {
  eyebrow: "MECANISMO DE AÇÃO",
  heading: "A dupla ação, na concentração que a ciência recomenda",
  intro:
    "Ketochlor® é indicado para o tratamento dos sinais clínicos relacionados às infecções secundárias associadas à DAC, promovendo a redução do prurido e da gravidade das lesões — principalmente nos casos agravados pela hiperproliferação de fungos e bactérias sensíveis à Clorexidina e ao Cetoconazol.",
  colunas: [
    {
      titulo: "Cetoconazol 1%",
      subtitulo: "Ação antifúngica superior",
      corpo:
        "Penetração 7 a 14 vezes superior à do miconazol no estrato córneo². Alta afinidade pela queratina garante efeito residual prolongado e previne a recolonização². Maior espectro de ação antifúngica in vitro³.",
    },
    {
      titulo: "Clorexidina 2,3%",
      subtitulo: "Controle bacteriano decisivo",
      corpo:
        "De acordo com o ISCAID (2025), a clorexidina em concentrações de 2% a 4% deve ser a principal escolha terapêutica tópica para cães¹. Ketochlor® foi formulado com a concentração ideal¹ em associação com antifúngico.",
    },
  ],
  closing: "Dois ativos. Uma diretriz internacional como validador.",
};

export const TECNOLOGIA_SIS = {
  eyebrow: "TECNOLOGIA EXCLUSIVA VIRBAC",
  heading: "Tecnologia exclusiva SIS: além da ação antimicrobiana",
  body: "Ketochlor® é o único do mercado com a tecnologia exclusiva SIS — Skin Innovative Science™, a junção de duas tecnologias proprietárias Virbac: Glyco® e Defensin®⁴. Combinadas, elas auxiliam o equilíbrio do microbioma cutâneo e apoiam a manutenção de uma pele saudável — reforço que vai além do controle antifúngico e bacteriano, relevante especialmente para o paciente atópico, cuja barreira cutânea já está comprometida.",
};

export const PROVA_AUTORIDADE = {
  eyebrow: "PROVA DE AUTORIDADE",
  heading: "Resultados observados em estudo clínico Virbac",
  stats: [
    {
      value: "70%",
      label: "dos cães com melhora clínica significativa dos sinais avaliados",
      pct: 70,
    },
    {
      value: "63%",
      label: "redução média do prurido relatado pelos tutores",
      pct: 63,
    },
    {
      value: "100%",
      label: "de satisfação dos tutores que testaram o produto",
      pct: 100,
    },
  ],
  note: 'Dados internos Virbac ("data on file")⁵, estudo com 41 cães. Racional científico apoiado em literatura publicada e revisada — ISCAID (2025)¹, Pershing et al. (1994)², Gupta et al. (2025)³.',
  ctaLabel: "QUERO ACESSAR O ESTUDO COMPLETO",
};

export const PROTOCOLO = {
  eyebrow: "PROTOCOLO DE USO",
  heading: "Protocolo simples de prescrever",
  modoUso:
    "Aplicar duas vezes por semana. Massagear e deixar o produto agir na pelagem por 10 minutos antes de enxaguar. Duração do tratamento: 5 semanas, ou a critério do médico-veterinário.",
  estabilidadeBadge: "12 MESES DE ESTABILIDADE",
  closing: {
    product: "Ketochlor®",
    highlight: "é o único do mercado",
    text: "Garantia de estabilidade por 12 meses após aberto, permitindo o tratamento completo, sem interrupção por perda de eficácia e sem desperdício para o tutor.",
  },
};

export const DOSAGEM: DosageRow[] = [
  { peso: "< 4,99", volumeMl: "10" },
  { peso: "5 – 10,99", volumeMl: "15" },
  { peso: "11 – 15,99", volumeMl: "20" },
  { peso: "16 – 20,99", volumeMl: "25" },
  { peso: "21 – 30,99", volumeMl: "30" },
  { peso: "31 – 45,99", volumeMl: "40" },
  { peso: "> 46", volumeMl: "50" },
];

export const DIFERENCIAIS = {
  eyebrow: "SÍNTESE COMPARATIVA",
  heading: "Por que Ketochlor®, em síntese",
  items: [
    {
      titulo: "Eficácia antifúngica superior",
      corpo:
        "Cetoconazol com 7-14x mais penetração no estrato córneo e efeito residual prolongado²",
    },
    {
      titulo: "Potência antisséptica otimizada",
      corpo:
        "2,3% de Clorexidina, dentro da concentração recomendada pelo ISCAID¹",
    },
    {
      titulo: "Tecnologia exclusiva SIS",
      corpo:
        "Estimula as defesas naturais da pele  essencial para o paciente atópico⁴",
    },
    {
      titulo: "Estabilidade incomparável",
      corpo:
        "Único com de validade em uso  tratamento completo, sem desperdício",
    },
  ],
};

export const MATERIAL_TECNICO = {
  eyebrow: "ACESSO AO MATERIAL TÉCNICO",
  heading:
    "O material técnico completo sobre Ketochlor® está a um cadastro de distância.",
  subheading:
    "Indicação, mecanismo de ação e protocolo de prescrição, com acesso imediato após o cadastro.",
  ctaLabel: "QUERO ACESSAR O MATERIAL TÉCNICO COMPLETO",
  legal: "Cadastro rápido. Acesso imediato. Dados protegidos conforme LGPD.",
};

export const CTA_SECUNDARIO = {
  heading: "Prefere conversar diretamente com a equipe Virbac?",
  body: "Deseja receber contato ou visita da equipe comercial? Marque essa opção no formulário acima.",
  ctaLabel: "SOLICITAR CONTATO",
};

export const FAQS: FaqItem[] = [
  {
    question: "Ketochlor deve ser usado de forma contínua em cães com DAC?",
    answer:
      "Não. A recomendação da literatura é que, após o tratamento das infecções secundárias por 4 a 5 semanas, o paciente passe a usar um shampoo hidratante de forma contínua (como Allermyl(r)), retornando ao uso do Ketochlor somente se houver recidiva do processo infeccioso.",
  },
  {
    question: "Ketochlor® substitui o tratamento sistêmico da DAC?",
    answer:
      "Em geral, não. Nos casos de Dermatite Atópica, o tratamento tópico faz parte de um conjunto de cuidados necessários para reduzir recidivas e manter a qualidade de vida do paciente, aliado ao tratamento sistêmico, controle de ectoparasitas, mudanças na dieta, entre outros.",
  },
  {
    question:
      "Qual a diferença entre usar Ketochlor® e o Hexadene Spherulites®?",
    answer:
      "Enquanto Ketochlor possui uma combinação de 2 ingredientes (Clorexidina e Cetoconazol), sendo indicado em casos mais crônicos, em geral relacionados à Dermatite Atópica, o Hexadene é uma solução única (Clorexidina 3%), mais indicado em casos primários, mais simples ou casos agudos de piodermite.",
  },
  {
    question:
      "Por que a estabilidade de 12 meses após aberto importa clinicamente?",
    answer:
      "Garante que o produto mantenha eficácia ao longo do tratamento e retratamentos, sem perda por degradação — reduzindo desperdício.",
  },
];

export const REFERENCIAS = [
  "1. Loeffler A et al. ISCAID. Vet Dermatol. 2025;36(3):234-282.",
  "2. Pershing LK, Corlett J, Jorgensen C. Antimicrob Agents Chemother. 1994;38(1):90-95.",
  "3. Gupta AK, De Doncker P, Talukder M. JEADV Clinical Practice. 2025.",
  "4. Santoro D et al. Res Vet Sci. 2018 Jun;118:164-170.",
  "5. Data on file – Virbac.",
  "6. Ferreira TC, Cunha MGMC, Nunes-Pinheiro DCS. Ciência Rural. 2023;53(8).",
];

export const FOOTER_LINKS = [
  "Sobre a Virbac",
  "Política de Privacidade e LGPD",
  "Termos e Condições",
  "Contato",
  "Uso Veterinário · Cães",
];
