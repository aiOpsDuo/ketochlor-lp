/**
 * Corpo de `POST /api/admin/operators`. Interface TS simples, sem decorators
 * — mesmo padrão de `AtualizarMetadataDto` (a validação de negócio vive no
 * Domínio, `validarCriacaoOperador`, não em um DTO decorado).
 */
export interface CriarOperadorDto {
  email: string;
  senha: string;
  nome: string;
}
