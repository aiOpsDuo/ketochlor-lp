import type { ClaimsUsuarioAutenticado } from '../../domain/portas/verificador-token';

// Aumenta o tipo `Request` do Express com o campo que `AuthGuard` anexa após
// verificar o token, para uso por outros módulos (ex. `updatedBy`/`createdBy`
// nas escritas de `api/modulo-content`, `api/modulo-metadata` etc.).
declare module 'express' {
  interface Request {
    usuario?: ClaimsUsuarioAutenticado;
  }
}
