/**
 * Texto do aceite LGPD do formulário de Material Técnico, em partes: o trecho
 * do meio vira o link para a política de privacidade em `FormularioCTA`, e a
 * concatenação das três é o texto puro (sem marcação) enviado em
 * `consentimentoTexto` para `POST /api/leads` — gravado em
 * `leads.consentimento_texto` como prova do que o visitante viu ao aceitar.
 * Uma única fonte para os dois usos, para o texto gravado nunca divergir do
 * texto exibido.
 */
export const TEXTO_CONSENTIMENTO_ANTES_DO_LINK = 'Li e aceito a ';
export const TEXTO_CONSENTIMENTO_LINK = 'política de privacidade';
export const TEXTO_CONSENTIMENTO_DEPOIS_DO_LINK = ' (LGPD)';

export const TEXTO_CONSENTIMENTO_LGPD =
  TEXTO_CONSENTIMENTO_ANTES_DO_LINK + TEXTO_CONSENTIMENTO_LINK + TEXTO_CONSENTIMENTO_DEPOIS_DO_LINK;
