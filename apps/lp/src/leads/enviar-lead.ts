import type { LeadFormData } from '../types';

/** Identifica, em `origem`, que o envio veio do formulário de Material Técnico. */
const ORIGEM_MATERIAL_TECNICO = 'material_tecnico';

/**
 * Corpo aceito por `POST /api/leads` (docs/API.md § Leads;
 * `apps/api/src/domain/leads/validar-lead.ts`, tipo `LeadPayloadBruto`).
 * Repetido aqui (em vez de importado de `apps/api`) porque `apps/lp` não
 * depende do código da API — só do contrato HTTP documentado.
 */
export interface LeadPayload {
  nome: string;
  email: string;
  telefone?: string;
  crmv?: string;
  estadoCidade?: string;
  especialidade?: string;
  jaClienteVirbac?: boolean;
  desejaContatoComercial?: boolean;
  origem?: string;
  consentimentoAceito: boolean;
}

/** Converte o estado do formulário (`LeadFormData`) no corpo esperado por `POST /api/leads`. */
export function paraLeadPayload(form: LeadFormData): LeadPayload {
  return {
    nome: form.nome,
    email: form.email,
    telefone: form.telefone || undefined,
    crmv: form.crmv || undefined,
    estadoCidade: form.estadoCidade || undefined,
    especialidade: form.especialidade || undefined,
    jaClienteVirbac: form.jaClienteVirbac,
    desejaContatoComercial: form.desejaContatoComercial,
    origem: ORIGEM_MATERIAL_TECNICO,
    consentimentoAceito: form.aceitaLGPD,
  };
}

/**
 * Envia o formulário de Material Técnico para `POST /api/leads`.
 *
 * Caminho relativo de propósito, mesmo raciocínio de `fetch-published-
 * -content.ts` (proxy do Vite/nginx já serve API e LP sob o mesmo domínio).
 *
 * Lança um `Error` explícito (nunca deixa uma exceção "crua" vazar sem
 * contexto) em qualquer falha — erro de rede ou resposta HTTP não-2xx
 * (ex.: `422` de validação que o cliente não pegou). Quem chama
 * (`FormularioCTA`) decide como exibir o erro ao visitante; só considera o
 * envio bem-sucedido depois que esta função resolve sem lançar.
 */
export async function enviarLead(payload: LeadPayload): Promise<void> {
  const resposta = await requisitarEnvio(payload);

  if (!resposta.ok) {
    throw new Error(await extrairMensagemDeErro(resposta));
  }
}

async function requisitarEnvio(payload: LeadPayload): Promise<Response> {
  try {
    return await fetch('/api/leads', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (erroDeRede) {
    throw new Error(`Falha de rede ao enviar POST /api/leads: ${String(erroDeRede)}`);
  }
}

/** Prioriza a `message` de erro que a API devolve (ex. `422`); cai para status/texto genérico. */
async function extrairMensagemDeErro(resposta: Response): Promise<string> {
  const mensagemDaApi = await mensagemDoCorpoDeErro(resposta);
  return mensagemDaApi ?? `POST /api/leads respondeu ${resposta.status} ${resposta.statusText}`;
}

async function mensagemDoCorpoDeErro(resposta: Response): Promise<string | null> {
  try {
    const corpo: unknown = await resposta.json();
    if (typeof corpo === 'object' && corpo !== null && 'message' in corpo) {
      const mensagem = (corpo as Record<string, unknown>).message;
      if (typeof mensagem === 'string') {
        return mensagem;
      }
    }
  } catch {
    // corpo de erro não é JSON — cai para a mensagem genérica em extrairMensagemDeErro
  }
  return null;
}
