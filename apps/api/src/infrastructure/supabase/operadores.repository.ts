import type { SupabaseClient, User } from '@supabase/supabase-js';
import type { Operador } from '../../domain/operators/operador';
import type {
  CriarOperadorInput,
  OperadoresRepository,
} from '../../domain/portas/operadores.repository';

/**
 * Deriva um nome legível a partir da parte local do e-mail (antes do `@`),
 * capitalizando palavras separadas por `.`/`_`/`-` — usado quando o usuário
 * do Supabase Auth não tem `user_metadata.name` (ex.: criado fora deste
 * módulo, direto no painel do Supabase, ou por uma versão futura da Admin API
 * que mude o formato de metadata). `Operador.nome` nunca fica vazio.
 */
function nomeAPartirDoEmail(email: string): string {
  const parteLocal = email.split('@')[0] ?? '';
  const palavras = parteLocal
    .split(/[._-]+/)
    .filter((palavra) => palavra.length > 0)
    .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1));
  return palavras.length > 0 ? palavras.join(' ') : email;
}

function paraOperador(user: User): Operador {
  const nomeMetadata =
    typeof user.user_metadata?.name === 'string' ? user.user_metadata.name.trim() : '';
  const email = user.email ?? '';
  return {
    id: user.id,
    email,
    nome: nomeMetadata.length > 0 ? nomeMetadata : nomeAPartirDoEmail(email),
    criadoEm: user.created_at,
    ultimoLoginEm: user.last_sign_in_at ?? null,
  };
}

/**
 * Implementa `OperadoresRepository` (Domínio) direto contra o Supabase Auth
 * Admin API — **sem tabela própria no Postgres** (ver comentário da porta).
 * Único repositório de Infraestrutura deste projeto que não fala com o
 * Postgres via `.from(TABELA)`.
 */
export class SupabaseOperadoresRepository implements OperadoresRepository {
  constructor(private readonly client: SupabaseClient) {}

  /**
   * `listUsers()` pagina por padrão (50 usuários por página) — não passamos
   * `page`/`perPage` porque o volume de operadores deste projeto (poucos
   * usuários com acesso administrativo) nunca se aproxima disso; mesma
   * proporcionalidade já aceita em `LeadsRepository.listarPorPeriodo` (listagem
   * completa, sem paginação).
   */
  async listarTodos(): Promise<Operador[]> {
    const { data, error } = await this.client.auth.admin.listUsers();
    if (error) {
      throw new Error(`Falha ao listar operadores: ${error.message}`);
    }
    return data.users.map(paraOperador);
  }

  async criar(input: CriarOperadorInput): Promise<Operador> {
    const { data, error } = await this.client.auth.admin.createUser({
      email: input.email,
      password: input.senha,
      // Essencial: a conta nasce pronta para logar, sem link nem e-mail de
      // convite (PLAN.md, tarefa `ajustes/modulo-operadores`) — quem cria um
      // operador pelo painel entrega a senha inicial a essa pessoa por fora.
      email_confirm: true,
      user_metadata: { name: input.nome },
    });
    if (error || !data.user) {
      throw new Error(`Falha ao criar o operador "${input.email}": ${error?.message}`);
    }
    return paraOperador(data.user);
  }

  async remover(id: string): Promise<void> {
    const { error } = await this.client.auth.admin.deleteUser(id);
    if (error) {
      throw new Error(`Falha ao remover o operador "${id}": ${error.message}`);
    }
  }
}
