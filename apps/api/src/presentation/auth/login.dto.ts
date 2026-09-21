/**
 * Corpo de `POST /api/auth/login`. Interface TS simples, sem decorators —
 * mesmo padrão de `CriarOperadorDto` (a validação de formato vive no
 * Domínio, `validarLogin`, não em um DTO decorado).
 */
export interface LoginDto {
  email: string;
  senha: string;
}
