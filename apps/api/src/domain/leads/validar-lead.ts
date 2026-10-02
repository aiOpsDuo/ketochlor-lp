import type {
  ErroValidacaoCampo,
  ResultadoValidacao,
} from '../shared/resultado-validacao';

/**
 * Formato aceito bruto do formulário de Material Técnico (SDD § Modelo de
 * dados — tabela `leads`; PRD § Compliance/LGPD).
 *
 * **Mudança de 2026-10-02 (pedido do cliente):** o aceite deixou de ser só
 * condição de envio e passou a ser registrado em `leads`
 * (`consentimento_aceito`/`_em`/`_texto`/`_politica_url`, migration
 * `0006_add_consentimento_to_leads.sql`) — o Marketing precisa do registro
 * para gerir a base e excluir leads em caso de revogação. A regra de envio
 * continua a mesma: sem `consentimentoAceito === true`, o lead não nasce.
 */
export interface LeadPayloadBruto {
  nome: string;
  email: string;
  telefone?: string;
  crmv?: string;
  estadoCidade?: string;
  especialidade?: string;
  jaClienteVirbac?: boolean;
  desejaContatoComercial?: boolean;
  origem?: string;
  /** Precisa ser estritamente `true` — qualquer outro valor recusa o envio. */
  consentimentoAceito: boolean;
  /**
   * Texto do aceite exatamente como o visitante o viu (texto puro, sem
   * marcação). Opcional; quando informado, precisa ser string de até
   * `TAMANHO_MAXIMO_TEXTO_CONSENTIMENTO` caracteres (após `trim`).
   */
  consentimentoTexto?: string;
}

/**
 * Forma que de fato nasce como registro. `consentimentoAceito` só pode ser
 * `true` aqui (o tipo literal documenta a invariante); `consentimentoTexto`
 * vira `null` quando ausente ou vazio. O instante do aceite e a URL da
 * política não fazem parte do dado validado: os dois são decididos do lado
 * do servidor (relógio da Infraestrutura e `POLITICA_PRIVACIDADE_URL`,
 * respectivamente), nunca aceitos do corpo da requisição.
 */
export type LeadValidado = Omit<
  LeadPayloadBruto,
  'consentimentoAceito' | 'consentimentoTexto'
> & {
  consentimentoAceito: true;
  consentimentoTexto: string | null;
};

/** Mesmo tamanho de `leads.consentimento_texto` (`VARCHAR(500)`). */
export const TAMANHO_MAXIMO_TEXTO_CONSENTIMENTO = 500;

const CAMPO_OBRIGATORIO = (campo: string): ErroValidacaoCampo => ({
  campo,
  mensagem: `O campo "${campo}" é obrigatório.`,
});

/** Formato de e-mail razoável — validação de forma, não de existência da caixa. */
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Invariantes do lead (SDD § Camadas e padrão arquitetural — Domínio;
 * § Modelo de dados — tabela `leads`): `nome` e `email` obrigatórios e não
 * vazios, `email` em formato razoável, e — a regra que nenhum dos outros
 * campos consegue contornar — `consentimentoAceito` precisa ser
 * estritamente `true`. Um payload com todos os outros campos válidos, mas
 * sem consentimento, é rejeitado do mesmo jeito (PRD § Compliance/LGPD:
 * "o envio é recusado sem esse aceite, e o registro do lead só nasce depois
 * dele"). `consentimentoTexto`, quando presente, precisa ser string (qualquer
 * outro tipo é recusado, inclusive `null`) de até
 * `TAMANHO_MAXIMO_TEXTO_CONSENTIMENTO` caracteres depois do `trim` — recusado
 * em vez de truncado, para o registro nunca guardar um texto diferente do que
 * o visitante viu.
 */
export function validarLead(
  payload: LeadPayloadBruto,
): ResultadoValidacao<LeadValidado> {
  const erros: ErroValidacaoCampo[] = [];

  const nome = payload.nome?.trim() ?? '';
  if (nome.length === 0) {
    erros.push(CAMPO_OBRIGATORIO('nome'));
  }

  const email = payload.email?.trim() ?? '';
  if (email.length === 0) {
    erros.push(CAMPO_OBRIGATORIO('email'));
  } else if (!EMAIL_REGEX.test(email)) {
    erros.push({ campo: 'email', mensagem: 'O e-mail informado não é válido.' });
  }

  if (payload.consentimentoAceito !== true) {
    erros.push({
      campo: 'consentimentoAceito',
      mensagem:
        'É necessário aceitar a política de privacidade para enviar o formulário.',
    });
  }

  let consentimentoTexto: string | null = null;
  if (payload.consentimentoTexto !== undefined) {
    if (typeof payload.consentimentoTexto !== 'string') {
      erros.push({
        campo: 'consentimentoTexto',
        mensagem: 'O campo "consentimentoTexto" precisa ser um texto.',
      });
    } else {
      const texto = payload.consentimentoTexto.trim();
      if (texto.length > TAMANHO_MAXIMO_TEXTO_CONSENTIMENTO) {
        erros.push({
          campo: 'consentimentoTexto',
          mensagem: `O campo "consentimentoTexto" aceita no máximo ${TAMANHO_MAXIMO_TEXTO_CONSENTIMENTO} caracteres.`,
        });
      } else if (texto.length > 0) {
        consentimentoTexto = texto;
      }
    }
  }

  if (erros.length > 0) {
    return { sucesso: false, erros };
  }

  const {
    consentimentoAceito: _consentimentoAceito,
    consentimentoTexto: _consentimentoTexto,
    ...lead
  } = payload;
  return {
    sucesso: true,
    dado: { ...lead, nome, email, consentimentoAceito: true, consentimentoTexto },
  };
}
