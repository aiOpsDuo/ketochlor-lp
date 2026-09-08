/**
 * Prefixos de rota compartilhados entre `main.ts` (que aplica o prefixo
 * global via `app.setGlobalPrefix`) e `AuthGuard` (que decide, a partir do
 * caminho da requisição, se uma rota exige token — ver comentário de decisão
 * em `auth.guard.ts`). Fonte única para não duplicar a string "api"/"admin"
 * em mais de um lugar (Clean Code G25 — constantes nomeadas).
 */
export const API_GLOBAL_PREFIX = 'api';

/** Segmento de rota administrativa. Toda rota registrada sob este segmento, em qualquer controller/módulo, é protegida automaticamente pelo `AuthGuard`. */
export const ADMIN_SEGMENT = 'admin';

/** Caminho completo (com o prefixo global já aplicado) que o `AuthGuard` usa para decidir se uma requisição exige token. */
export const ADMIN_ROUTE_PREFIX = `/${API_GLOBAL_PREFIX}/${ADMIN_SEGMENT}`;
