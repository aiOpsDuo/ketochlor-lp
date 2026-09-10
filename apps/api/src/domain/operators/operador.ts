/**
 * Um operador é, integralmente, um usuário do Supabase Auth (SDD § Decisões
 * técnicas e trade-offs — "Autenticação via Supabase Auth"; PLAN.md, tarefa
 * `ajustes/modulo-operadores`). **Não existe tabela `operators` no Postgres**:
 * o Supabase Auth já é a única fonte de identidade de quem pode logar no
 * painel (é dele que vem o JWT verificado por `AuthGuard`), então este tipo é
 * só a forma que a Apresentação devolve, montada a partir do usuário do Auth
 * (`SupabaseOperadoresRepository`, Infraestrutura) — nunca persistida por
 * conta própria.
 */
export interface Operador {
  /** Id do usuário no Supabase Auth — o mesmo valor de `ClaimsUsuarioAutenticado.sub`. */
  id: string;
  email: string;
  /**
   * Nome de exibição. Vem de `user_metadata.name` quando o operador foi
   * criado com um nome (`SupabaseOperadoresRepository.criar`); se ausente
   * (ex.: usuário criado fora deste módulo, direto no Supabase Auth), é
   * derivado da parte local do e-mail — nunca fica vazio na resposta.
   */
  nome: string;
  /** Data de criação da conta no Supabase Auth (ISO 8601). */
  criadoEm: string;
  /** Data do último login bem-sucedido (ISO 8601), ou `null` se o operador nunca acessou. */
  ultimoLoginEm: string | null;
}
