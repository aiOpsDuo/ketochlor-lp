import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { SupabaseEnv } from '../config/supabase-env';

/**
 * Cria o cliente Supabase do lado do servidor, autenticado com a chave
 * `service_role` (ignora RLS — SDD § Modelo de dados → Row Level Security:
 * "todo acesso passa pela API usando a chave secreta do lado do servidor").
 * Único ponto do código que instancia o SDK — todo repositório de
 * Infraestrutura recebe este cliente por injeção, nunca cria o seu próprio.
 */
export function criarSupabaseAdminClient(env: SupabaseEnv): SupabaseClient {
  return createClient(env.url, env.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
