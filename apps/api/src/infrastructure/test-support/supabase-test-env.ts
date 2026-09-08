import { carregarSupabaseEnv, type SupabaseEnv } from '../config/supabase-env';

/**
 * Suporte só para os testes de integração de `src/infrastructure` (nunca
 * importado por código de produção). Lê o mesmo `SupabaseEnv` que a
 * Infraestrutura usa em runtime — os testes rodam contra o Supabase LOCAL
 * (`npx supabase start`), nunca contra mocks do SDK (ver critério de
 * "pronto" da tarefa `api/infra-supabase-adapters`).
 *
 * `ANON_KEY` não faz parte de `SupabaseEnv` (a API nunca precisa dela em
 * runtime — é o painel, via SDK cliente, quem usa a chave publicável) — só os
 * testes do verificador de token precisam dela, para simular um login real
 * de operador contra o Supabase Auth local e obter um JWT de verdade.
 */
export function carregarSupabaseTestEnv(): SupabaseEnv {
  return carregarSupabaseEnv(process.env);
}

/**
 * Chave `anon` padrão, pública e fixa, de qualquer instância local do
 * Supabase CLI (mesma para todo mundo, documentada em
 * `docs/BANCO-DE-DADOS.md`) — não é segredo real, por isso pode ficar aqui em
 * vez de em `.env` (que documenta só o que a API de fato consome).
 */
export const ANON_KEY_LOCAL =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
