import { Inject, Injectable } from '@nestjs/common';
import { POLITICA_PRIVACIDADE_URL } from '@ketochlor/content-schema';
import type { ErroValidacaoCampo, LeadPersistido, LeadsRepository } from '../../domain';
import { validarLead } from '../../domain';
import { LEADS_REPOSITORY } from './leads-repository.token';

/**
 * Corpo de `POST /api/leads` (SDD § Contratos de dados/API/interfaces —
 * Leads; PRD § Compliance/LGPD). Mesmo formato de `LeadPayloadBruto`
 * (Domínio) — duplicado aqui de propósito, mesmo padrão já usado por
 * `AtualizarMetadataInput`/`EmitirCredencialUploadInput`: cada camada declara
 * sua própria visão do contrato (Domínio para a validação, Aplicação para o
 * caso de uso, Apresentação para o DTO HTTP), mesmo quando a forma coincide.
 */
export interface RegistrarLeadInput {
  nome: string;
  email: string;
  telefone?: string;
  crmv?: string;
  estadoCidade?: string;
  especialidade?: string;
  jaClienteVirbac?: boolean;
  desejaContatoComercial?: boolean;
  origem?: string;
  /** Condição de envio (precisa ser `true`) e, desde 2026-10-02, registrado em `leads.consentimento_aceito`. */
  consentimentoAceito: boolean;
  /** Texto do aceite exibido ao visitante — opcional, ver `LeadPayloadBruto`. */
  consentimentoTexto?: string;
}

export type ResultadoRegistroLead =
  | { sucesso: true; lead: LeadPersistido }
  | { sucesso: false; erros: ErroValidacaoCampo[] };

/**
 * Caso de uso de `POST /api/leads` (SDD § Contratos de dados/API/interfaces —
 * rota PÚBLICA, sem autenticação — nenhum `AuthGuard` protege esta rota
 * porque ela não está registrada sob `/api/admin`, ver
 * `presentation/leads/leads-public.controller.ts`). Valida o corpo via
 * `validarLead` (Domínio) ANTES de persistir — o controller nunca chama o
 * repositório diretamente, mesmo padrão de
 * `AtualizarMetadataUseCase`/`EmitirCredencialUploadUseCase`.
 *
 * Registro do consentimento (pedido do cliente de 2026-10-02, ver
 * `agent_context/CHANGELOG.md`): o aceite validado segue para o repositório
 * junto com `POLITICA_PRIVACIDADE_URL` — anexada AQUI, do lado do servidor,
 * depois do dado validado, para nenhum valor vindo do corpo da requisição
 * sobrescrevê-la. O instante do aceite é o relógio da Infraestrutura (o mesmo
 * de `created_at`), nunca um horário enviado pelo cliente.
 */
@Injectable()
export class RegistrarLeadUseCase {
  constructor(
    @Inject(LEADS_REPOSITORY)
    private readonly repositorio: LeadsRepository,
  ) {}

  /**
   * @returns `{ sucesso: false, erros }` se `nome`/`email` estiverem vazios,
   * `email` não tiver formato válido, ou `consentimentoAceito` não for
   * estritamente `true`, ou `consentimentoTexto` for inválido (a
   * Apresentação traduz para `422`); caso contrário, o lead criado, já com o
   * registro do consentimento.
   */
  async executar(input: RegistrarLeadInput): Promise<ResultadoRegistroLead> {
    const validacao = validarLead(input);
    if (!validacao.sucesso) {
      return { sucesso: false, erros: validacao.erros };
    }

    const lead = await this.repositorio.criar({
      ...validacao.dado,
      consentimentoPoliticaUrl: POLITICA_PRIVACIDADE_URL,
    });
    return { sucesso: true, lead };
  }
}
