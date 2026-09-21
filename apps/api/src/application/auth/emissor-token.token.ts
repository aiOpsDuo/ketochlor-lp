/**
 * Token de injeção do Nest para a porta `EmissorToken` (Domínio) — mesmo
 * motivo de existir do `VERIFICADOR_TOKEN`
 * (`presentation/auth/verificador-token.token.ts`), a quem este token é
 * companion (verificar/emitir). Vive na Aplicação, ao lado de
 * `LoginUseCase` (único consumidor), diferente de `VERIFICADOR_TOKEN` — que
 * vive na Apresentação porque `AuthGuard` (Apresentação) é quem o consome.
 */
export const EMISSOR_TOKEN = Symbol('EmissorToken');
