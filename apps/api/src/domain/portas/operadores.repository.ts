import type { Operador } from '../operators/operador';

/** Corpo de criação — ver comentário de decisão em `validarCriacaoOperador` (Domínio). */
export interface CriarOperadorInput {
  email: string;
  senha: string;
  nome: string;
}

/**
 * Porta do Domínio para gestão de operadores (PLAN.md, tarefa
 * `ajustes/modulo-operadores`). Ver nota de "Porta do Domínio" em
 * `content-sections.repository.ts`.
 *
 * Implementada pela Infraestrutura (`MySqlOperadoresRepository`) contra a
 * tabela própria `operators` — é dela que vem o JWT verificado por
 * `AuthGuard` (SDD § "Migração de plataforma de dados").
 */
export interface OperadoresRepository {
  /** Todos os operadores, em qualquer ordem — `ListarOperadoresUseCase` (Aplicação) decide a ordenação exposta pela API. */
  listarTodos(): Promise<Operador[]>;
  /**
   * Cria a conta já pronta para logar, sem link nem e-mail de convite
   * (`email_confirm: true` na implementação de Infraestrutura) — decisão de
   * UX da tarefa: quem cria um operador pelo painel já entrega a senha
   * inicial a essa pessoa por fora, ela não precisa confirmar nada por
   * e-mail antes do primeiro login.
   */
  criar(input: CriarOperadorInput): Promise<Operador>;
  /** Remove o operador permanentemente. As invariantes de negócio (não remover a própria conta / o último operador) são checadas ANTES desta chamada, por `RemoverOperadorUseCase` (Aplicação) — esta porta nunca as verifica. */
  remover(id: string): Promise<void>;
}
