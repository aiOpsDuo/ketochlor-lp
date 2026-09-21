import { carregarMysqlEnv, type MysqlEnv } from '../config/mysql-env';

/**
 * Suporte só para os testes de integração de `src/infrastructure` (nunca
 * importado por código de produção). Lê o mesmo `MysqlEnv` que a
 * Infraestrutura usa em runtime — os testes rodam contra o MySQL REAL do
 * `docker-compose.yml` (nunca contra mock do driver `mysql2`), mesmo
 * critério de "pronto" já usado pelos testes Supabase equivalentes
 * (`carregarSupabaseTestEnv`).
 *
 * Pré-requisito: `mysql` do compose no ar e com o schema já aplicado
 * (`npm run migrate:mysql --prefix apps/api`) — ver o comentário de
 * `docker-compose.yml`/`scripts/migrar-mysql.mjs` sobre a rede interna do
 * compose não publicar a porta do `mysql` para o host.
 */
export function carregarMysqlTestEnv(): MysqlEnv {
  return carregarMysqlEnv(process.env);
}
