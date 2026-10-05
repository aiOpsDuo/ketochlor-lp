import { POLITICA_PRIVACIDADE_URL } from "@ketochlor/content-schema";
import type { FooterLink, NavItem } from "../types";

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

/**
 * Links institucionais do rodapé — todos externos (site da Virbac Brasil),
 * abertos em nova aba por `Footer`. "Termos e Condições" aponta para a mesma
 * página de aviso legal da política de privacidade: o site da Virbac não tem
 * uma página separada de termos. "Uso Veterinário · Cães" é uma indicação de
 * uso do produto, não uma página — por isso sem `href` (vira texto simples).
 */
export const FOOTER_LINKS: FooterLink[] = [
  { label: "Sobre a Virbac", href: "https://br.virbac.com/home/sobre-nos.html" },
  { label: "Política de Privacidade e LGPD", href: POLITICA_PRIVACIDADE_URL },
  { label: "Termos e Condições", href: "https://br.virbac.com/home/legal-notice.html" },
  { label: "Contato", href: "https://br.virbac.com/contato" },
  { label: "Uso Veterinário · Cães" },
];

/**
 * Material técnico entregue após o cadastro no formulário de Material Técnico:
 * o PDF é estático (`apps/lp/public/materiais/`, servido pelo mesmo nginx da
 * LP) e o link de download aparece na tela de confirmação de `FormularioCTA`
 * assim que `POST /api/leads` responde 201. A API não envia e-mail — o acesso
 * é imediato, na própria página. Para trocar o material, substitua o arquivo
 * (mantendo o nome) ou atualize `url`/`tamanho` aqui.
 */
export const MATERIAL_TECNICO_DOWNLOAD = {
  url: "/materiais/ketochlor-folheto-tecnico.pdf",
  nomeArquivo: "Ketochlor-Folheto-Tecnico.pdf",
  rotulo: "BAIXAR O FOLHETO TÉCNICO",
  tamanho: "PDF, 2,4 MB",
};
