#!/usr/bin/env node
// Runner leve de migrations SQL para o MySQL do CMS — substitui o fluxo da
// CLI do Supabase (`supabase/migrations/`) para este propósito (SDD §
// "Migração de plataforma de dados"; PLAN.md, tarefa `migracao-mysql-schema`).
//
// O que faz: lê `apps/api/mysql/migrations/*.sql` em ordem alfabética do
// nome do arquivo (prefixo numérico `NNNN_`, garante ordem cronológica),
// cria `schema_migrations` se não existir, e aplica só os arquivos ainda não
// registrados nela — seguro de rodar de novo (arquivo já registrado nunca
// roda de novo).
//
// Decisão de credencial — roda como `root`, não como um usuário dedicado a
// migrations: o usuário de aplicação (`MYSQL_APP_USER`) NUNCA tem privilégio
// de DDL em runtime (ver `docker/mysql/initdb/01-create-app-user.sh` —
// GRANT limitado a SELECT/INSERT/UPDATE/DELETE/INDEX), então a API em
// produção jamais usa a credencial deste script. Entre "reusar root" e
// "criar mais um usuário dedicado só para DDL", reusar root foi a escolha:
// um usuário novo exigiria editar `docker-compose.yml`/`01-create-app-user.sh`
// (fora do escopo desta tarefa, pertence a `migracao-mysql-infra-compose`,
// já concluída) para ganho de isolamento marginal num projeto de poucos
// operadores internos, sem múltiplos times operando o banco — a mesma régua
// de proporcionalidade já usada no resto do projeto. `root` só é usado por
// este script, nunca por `apps/api` em runtime (que sempre lê `MYSQL_APP_*`,
// a partir da tarefa `migracao-mysql-adapters-conteudo`).
//
// Por que sem `BEGIN`/`COMMIT` por arquivo: toda migration desta pasta faz
// DDL (`CREATE TABLE`), e o MySQL força um commit implícito antes/depois de
// qualquer DDL (https://dev.mysql.com/doc/refman/8.4/en/implicit-commit.html)
// — envolver isso numa transação não adiciona nenhuma garantia real de
// atomicidade, só teatro. A idempotência real vem de duas camadas: dentro de
// cada arquivo (`CREATE TABLE IF NOT EXISTS`/`INSERT IGNORE`, para o caso de
// um arquivo rodar sem estar registrado) e de `schema_migrations` (para o
// caso normal — arquivo já registrado é pulado). Uma migration futura
// puramente DML (sem DDL) pode envolver suas próprias instruções em
// `START TRANSACTION`/`COMMIT` dentro do próprio arquivo `.sql`, se precisar.

import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mysql from 'mysql2/promise';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = resolve(SCRIPT_DIR, '../mysql/migrations');

function lerObrigatoria(env, nome) {
  const valor = env[nome];
  if (!valor) {
    throw new Error(`Variável de ambiente "${nome}" é obrigatória e não foi definida.`);
  }
  return valor;
}

/**
 * @param {NodeJS.ProcessEnv} env
 * @throws {Error} se `MYSQL_DATABASE`/`MYSQL_ROOT_PASSWORD` faltarem.
 */
function carregarMysqlMigrationEnv(env = process.env) {
  return {
    // Nome de serviço do compose (`docker-compose.yml`) por padrão — este
    // script foi desenhado para rodar dentro da rede interna do compose
    // (ex.: `docker compose run`, ou um container anexado à mesma rede),
    // já que `mysql` não publica `ports` para o host (SDD § Modelo de
    // dados > "Acesso à plataforma de dados"). Sobrescrevível via
    // `MYSQL_HOST` para quem publicar a porta manualmente (ex.: teste local
    // pontual com `docker compose port mysql 3306`).
    host: env.MYSQL_HOST ?? 'mysql',
    port: Number(env.MYSQL_PORT ?? 3306),
    database: lerObrigatoria(env, 'MYSQL_DATABASE'),
    user: 'root',
    password: lerObrigatoria(env, 'MYSQL_ROOT_PASSWORD'),
  };
}

async function listarArquivosDeMigracao() {
  const entradas = await readdir(MIGRATIONS_DIR);
  return entradas.filter((nome) => nome.endsWith('.sql')).sort();
}

async function garantirTabelaDeControle(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename VARCHAR(255) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function obterArquivosJaAplicados(connection) {
  const [linhas] = await connection.query('SELECT filename FROM schema_migrations');
  return new Set(linhas.map((linha) => linha.filename));
}

async function aplicarMigracao(connection, nomeArquivo) {
  const caminho = resolve(MIGRATIONS_DIR, nomeArquivo);
  const sql = await readFile(caminho, 'utf8');
  await connection.query(sql);
  await connection.execute('INSERT INTO schema_migrations (filename) VALUES (?)', [nomeArquivo]);
}

async function main() {
  const config = carregarMysqlMigrationEnv();
  // `multipleStatements: true`: cada arquivo desta pasta contém mais de uma
  // instrução (CREATE TABLE + INSERT de seed) — sem essa opção o driver
  // recusa executar mais de uma instrução por `query()`.
  const connection = await mysql.createConnection({ ...config, multipleStatements: true });

  try {
    await garantirTabelaDeControle(connection);
    const arquivos = await listarArquivosDeMigracao();
    const jaAplicados = await obterArquivosJaAplicados(connection);

    const pendentes = arquivos.filter((nome) => !jaAplicados.has(nome));
    if (pendentes.length === 0) {
      console.log('Nenhuma migration pendente — schema_migrations já cobre todos os arquivos.');
      return;
    }

    for (const nomeArquivo of pendentes) {
      await aplicarMigracao(connection, nomeArquivo);
      console.log(`Aplicada: ${nomeArquivo}`);
    }

    console.log(`${pendentes.length} migration(ns) aplicada(s) com sucesso.`);
  } finally {
    await connection.end();
  }
}

main().catch((erro) => {
  console.error('Falha ao rodar as migrations do MySQL:', erro);
  process.exitCode = 1;
});
