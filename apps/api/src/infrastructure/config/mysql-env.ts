/**
 * Leitura das variáveis de ambiente que a Infraestrutura precisa para falar
 * com o MySQL (SDD § Modelo de dados; § "Migração de plataforma de dados").
 * Nenhum valor real é hardcoded aqui — tudo vem de `process.env`, documentado
 * em `apps/api/.env.example`.
 *
 * Leitura + validação descritiva, sem valor hardcoded. O pool sempre autentica
 * como o usuário de aplicação (`MYSQL_APP_USER`/`MYSQL_APP_PASSWORD`, sem
 * privilégio de DDL em runtime — ver `docker/mysql/initdb/`), nunca como
 * `root` (reservado ao runner de migrations, `scripts/migrar-mysql.mjs`).
 */
export interface MysqlEnv {
  /** Host do serviço MySQL (nome do serviço no compose: `mysql`). */
  host: string;
  /** Porta do MySQL — opcional, default `3306`. */
  port: number;
  /** Nome do banco do CMS. */
  database: string;
  /** Usuário de aplicação — só CRUD (SELECT/INSERT/UPDATE/DELETE/INDEX), nunca `root`. */
  user: string;
  /** Senha do usuário de aplicação. */
  password: string;
}

const PORTA_PADRAO = 3306;

function lerObrigatoria(env: NodeJS.ProcessEnv, nome: string): string {
  const valor = env[nome];
  if (!valor) {
    throw new Error(`Variável de ambiente "${nome}" é obrigatória e não foi definida.`);
  }
  return valor;
}

/**
 * @throws {Error} se `MYSQL_HOST`/`MYSQL_DATABASE`/`MYSQL_APP_USER`/
 * `MYSQL_APP_PASSWORD` faltarem, ou se `MYSQL_PORT` estiver definida com um
 * valor que não é um número válido.
 */
export function carregarMysqlEnv(env: NodeJS.ProcessEnv = process.env): MysqlEnv {
  const host = lerObrigatoria(env, 'MYSQL_HOST');
  const database = lerObrigatoria(env, 'MYSQL_DATABASE');
  const user = lerObrigatoria(env, 'MYSQL_APP_USER');
  const password = lerObrigatoria(env, 'MYSQL_APP_PASSWORD');

  const portaBruta = env.MYSQL_PORT;
  const port = portaBruta === undefined ? PORTA_PADRAO : Number(portaBruta);
  if (Number.isNaN(port)) {
    throw new Error(`Variável de ambiente "MYSQL_PORT" precisa ser um número — recebido "${portaBruta}".`);
  }

  return { host, port, database, user, password };
}
