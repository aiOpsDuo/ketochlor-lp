import { Inject, Injectable } from '@nestjs/common';
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
  /** Condição de envio — nunca persistido (`validarLead` o consome e o remove). */
  consentimentoAceito: boolean;
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
 * `consentimentoAceito` só existe até aqui: `validarLead` o consome para
 * decidir se o envio é aceito e o remove do dado validado antes deste caso de
 * uso repassar ao repositório — nenhum caminho deste código grava esse campo
 * (PRD § Compliance/LGPD: "o consentimento nunca é persistido").
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
   * estritamente `true` (a Apresentação traduz para `422`); caso contrário, o
   * lead criado (sem `consentimentoAceito`).
   */
  async executar(input: RegistrarLeadInput): Promise<ResultadoRegistroLead> {
    const validacao = validarLead(input);
    if (!validacao.sucesso) {
      return { sucesso: false, erros: validacao.erros };
    }

    const lead = await this.repositorio.criar(validacao.dado);
    return { sucesso: true, lead };
  }
}
