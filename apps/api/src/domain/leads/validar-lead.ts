import type {
  ErroValidacaoCampo,
  ResultadoValidacao,
} from '../shared/resultado-validacao';

/**
 * Formato aceito bruto do formulário de Material Técnico (SDD § Modelo de
 * dados — tabela `leads`; PRD § Compliance/LGPD). `consentimentoAceito` **não
 * é uma coluna de `leads`** — é usado só para decidir se o lead pode nascer,
 * nunca persistido (SDD § Modelo de dados — "Por que não existe coluna
 * `aceite_lgpd`": a existência do registro, somada a `created_at`, já é a
 * prova de consentimento).
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
  /** Nunca persistido — ver comentário acima. */
  consentimentoAceito: boolean;
}

/** `LeadPayloadBruto` sem `consentimentoAceito` — a forma que de fato nasce como registro. */
export type LeadValidado = Omit<LeadPayloadBruto, 'consentimentoAceito'>;

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
 * dele").
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

  if (erros.length > 0) {
    return { sucesso: false, erros };
  }

  const { consentimentoAceito: _consentimentoAceito, ...lead } = payload;
  return {
    sucesso: true,
    dado: { ...lead, nome, email },
  };
}
