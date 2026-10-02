/**
 * URL da política de privacidade em vigor — fonte única compartilhada pela LP
 * (link do aceite no formulário de Material Técnico e item do rodapé) e pela
 * API (gravada em `leads.consentimento_politica_url` no momento do aceite,
 * sempre do lado do servidor, nunca vinda do corpo da requisição).
 *
 * Não é conteúdo editável do CMS (PRD § Fora de escopo — Header e Footer
 * ficam em código): vive aqui só porque este pacote já é a dependência comum
 * de `apps/lp`, `apps/admin` e `apps/api`. Aponta para a página institucional
 * da Virbac Brasil cuja seção "Política de privacidade" é a política aplicável
 * (não existe uma página dedicada só à política no site da Virbac). Ao trocar
 * esta URL, os leads novos passam a registrar a nova; os já gravados mantêm a
 * URL vigente quando o visitante aceitou.
 */
export const POLITICA_PRIVACIDADE_URL = 'https://br.virbac.com/home/legal-notice.html';
