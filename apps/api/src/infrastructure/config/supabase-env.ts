/**
 * Leitura das variáveis de ambiente que a Infraestrutura precisa para falar
 * com o Supabase (SDD § Modelo de dados; § Decisões técnicas e trade-offs).
 * Nenhum valor real é hardcoded aqui — tudo vem de `process.env`, documentado
 * em `apps/api/.env.example` e `docs/API.md`.
 */
export interface SupabaseEnv {
  /** URL da API do projeto Supabase (local: `http://127.0.0.1:54321`). */
  url: string;
  /** Chave `service_role` — ignora RLS, nunca exposta a um cliente (SDD § Modelo de dados → Row Level Security). */
  serviceRoleKey: string;
  /**
   * Segredo HS256 legado do projeto (`GOTRUE_JWT_SECRET`), usado para
   * verificar tokens localmente sem round-trip ao Auth server. É o único
   * mecanismo disponível numa instância local do Supabase CLI sem chaves de
   * assinatura assimétricas configuradas (ver
   * `apps/api/src/infrastructure/auth/jwks-token-verificador.ts`).
   */
  jwtSecret?: string;
  /**
   * URL do JWKS do projeto (`/.well-known/jwks.json` do Auth), usada quando o
   * projeto já emite tokens assinados com chave assimétrica (RS256/ES256) —
   * o caso normal em produção.
   */
  jwksUrl?: string;
  /** Bucket de Storage das imagens do CMS (SDD § Modelo de dados — `media_assets`). */
  storageBucket: string;
}

const BUCKET_PADRAO = 'images';

function lerObrigatoria(env: NodeJS.ProcessEnv, nome: string): string {
  const valor = env[nome];
  if (!valor) {
    throw new Error(`Variável de ambiente "${nome}" é obrigatória e não foi definida.`);
  }
  return valor;
}

/**
 * @throws {Error} se `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` faltarem, ou
 * se nem `SUPABASE_JWT_SECRET` nem `SUPABASE_JWKS_URL` estiverem presentes
 * (o verificador de token precisa de pelo menos um dos dois).
 */
export function carregarSupabaseEnv(env: NodeJS.ProcessEnv = process.env): SupabaseEnv {
  const url = lerObrigatoria(env, 'SUPABASE_URL');
  const serviceRoleKey = lerObrigatoria(env, 'SUPABASE_SERVICE_ROLE_KEY');
  const jwtSecret = env.SUPABASE_JWT_SECRET;
  const jwksUrl = env.SUPABASE_JWKS_URL;

  if (!jwtSecret && !jwksUrl) {
    throw new Error(
      'Defina "SUPABASE_JWT_SECRET" (projeto local, HS256) ou "SUPABASE_JWKS_URL" (projeto com chaves assimétricas) — o verificador de token precisa de pelo menos um.',
    );
  }

  return {
    url,
    serviceRoleKey,
    jwtSecret,
    jwksUrl,
    storageBucket: env.SUPABASE_STORAGE_BUCKET ?? BUCKET_PADRAO,
  };
}
