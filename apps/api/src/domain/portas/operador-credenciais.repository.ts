import type { Operador } from '../operators/operador';

/** Operador acompanhado do hash de senha — nunca exposto fora do fluxo de login. */
export interface OperadorComCredenciais {
  operador: Operador;
  /** Hash `bcryptjs` — nunca a senha em texto plano (ver `MySqlOperadoresRepository.criar`). */
  senhaHash: string;
}

/**
 * Porta do Domínio dedicada ao fluxo de login (PLAN.md, tarefa
 * `ajustes/migracao-mysql-modulo-auth-proprio`), SEPARADA de
 * `OperadoresRepository` (ISP — Interface Segregation): o CRUD de
 * `CriarOperadorUseCase`/`ListarOperadoresUseCase`/`RemoverOperadorUseCase`
 * nunca precisa de hash de senha nem de "gravar último login" — só o fluxo
 * de login precisa. Por isso esta é uma porta separada, implementada por
 * `MySqlOperadoresRepository` (que implementa as duas portas, cada uma
 * ligada a um token de injeção próprio — ver
 * `application/auth/operador-credenciais-repository.token.ts`).
 */
export interface OperadorCredenciaisRepository {
  /** `null` se nenhum operador tem este e-mail — `LoginUseCase` nunca revela essa diferença ao cliente HTTP. */
  buscarPorEmail(email: string): Promise<OperadorComCredenciais | null>;
  /** Grava `ultimo_login_em = agora` — chamado por `LoginUseCase` só após a senha conferir. */
  atualizarUltimoLogin(id: string): Promise<void>;
}
