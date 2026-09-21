import { carregarMinioEnv, type MinioEnv } from '../config/minio-env';

/**
 * Suporte só para os testes de integração de `src/infrastructure` (nunca
 * importado por código de produção). Lê o mesmo `MinioEnv` que a
 * Infraestrutura usa em runtime — os testes rodam contra o MinIO REAL do
 * `docker-compose.yml` (nunca contra mock do SDK), mesmo critério de
 * "pronto" já usado pelos testes MySQL/Supabase equivalentes
 * (`carregarMysqlTestEnv`/`carregarSupabaseTestEnv`).
 */
export function carregarMinioTestEnv(): MinioEnv {
  return carregarMinioEnv(process.env);
}
