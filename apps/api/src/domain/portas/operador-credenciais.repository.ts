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
 * `OperadoresRepository` (ISP — Interface Segregation): as duas invariantes
 * de negócio de `RemoverOperadorUseCase` e o CRUD de
 * `CriarOperadorUseCase`/`ListarOperadoresUseCase` nunca precisam de hash de
 * senha nem de "gravar último login", e o adaptador Supabase existente
 * (`SupabaseOperadoresRepository`, ainda em uso pelos casos de uso acima até
 * a tarefa `migracao-mysql-cutover-wiring`) não tem como fornecer nenhum dos
 * dois — a Auth Admin API do Supabase nunca expõe o hash de senha de um
 * usuário. Estender `OperadoresRepository` com estes dois métodos forçaria
 * `SupabaseOperadoresRepository` a implementar algo que não pode cumprir
 * (exatamente o sinal de violação de ISP documentado em
 * `padroes-codigo.md`) — por isso esta é uma porta nova, pequena, implementada
 * SÓ por `MySqlOperadoresRepository` (que implementa as duas portas, cada
 * uma ligada a um token de injeção próprio — ver
 * `application/auth/operador-credenciais-repository.token.ts`).
 */
export interface OperadorCredenciaisRepository {
  /** `null` se nenhum operador tem este e-mail — `LoginUseCase` nunca revela essa diferença ao cliente HTTP. */
  buscarPorEmail(email: string): Promise<OperadorComCredenciais | null>;
  /** Grava `ultimo_login_em = agora` — chamado por `LoginUseCase` só após a senha conferir. */
  atualizarUltimoLogin(id: string): Promise<void>;
}
