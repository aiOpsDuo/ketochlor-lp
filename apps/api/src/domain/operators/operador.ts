/**
 * Um operador é uma linha da tabela própria `operators` no MySQL (SDD §
 * "Migração de plataforma de dados"; PLAN.md, tarefa
 * `ajustes/migracao-mysql-modulo-auth-proprio`) — a única fonte de
 * identidade de quem pode logar no painel (é dela que vem o JWT verificado
 * por `AuthGuard`). Este tipo é a forma que a Apresentação devolve, montada
 * pela Infraestrutura (`MySqlOperadoresRepository`) a partir da linha —
 * nunca inclui o hash de senha (ver `OperadorComCredenciais`, usado só no
 * fluxo de login).
 */
export interface Operador {
  /** Id do operador (UUID gerado na criação) — o mesmo valor de `ClaimsUsuarioAutenticado.sub`. */
  id: string;
  email: string;
  /** Nome de exibição, obrigatório na criação (`MySqlOperadoresRepository.criar`) — nunca fica vazio na resposta. */
  nome: string;
  /** Data de criação da conta (ISO 8601). */
  criadoEm: string;
  /** Data do último login bem-sucedido (ISO 8601), ou `null` se o operador nunca acessou. */
  ultimoLoginEm: string | null;
}
