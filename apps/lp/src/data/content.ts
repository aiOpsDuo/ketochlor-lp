import type { NavItem } from "../types";

/**
 * Header e Footer permanecem fixos em código (PRD § Fora de escopo —
 * "Edição de Header e Footer"): a navegação, a lista de referências
 * bibliográficas e os links institucionais do rodapé não fazem parte do
 * CMS. As demais 11 seções da LP migraram para `usePublishedContent()`
 * (`lp/migrar-secoes-para-cms`) — o conteúdo delas não vive mais aqui.
 */
export const NAV_ITEMS: NavItem[] = [
  { label: "Início", targetId: "inicio" },
  { label: "O Problema", targetId: "problema" },
  { label: "Mecanismo", targetId: "mecanismo" },
  { label: "Tecnologia SIS", targetId: "tecnologia-sis" },
  { label: "Protocolo", targetId: "protocolo" },
  { label: "Diferenciais", targetId: "diferenciais" },
  { label: "FAQ", targetId: "faq" },
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
