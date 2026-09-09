/**
 * Corpo de `POST /api/leads`. Sem decorators de validação
 * (`class-validator`/`class-transformer` não são dependências deste
 * projeto, ver `apps/api/package.json`) — de propósito, mesmo padrão de
 * `presentation/metadata/atualizar-metadata.dto.ts`: a validação é a
 * validação de negócio do Domínio (`validarLead`), não uma checagem de forma
 * de DTO genérica. Este tipo só documenta o contrato HTTP para o controller
 * e para quem chama a API (o formulário de Material Técnico da LP).
 */
export interface RegistrarLeadDto {
  nome: string;
  email: string;
  telefone?: string;
  crmv?: string;
  estadoCidade?: string;
  especialidade?: string;
  jaClienteVirbac?: boolean;
  desejaContatoComercial?: boolean;
  origem?: string;
  /** A API recusa (`422`) qualquer corpo sem isto estritamente `true`; nunca persistido (PRD § Compliance/LGPD). */
  consentimentoAceito: boolean;
}
