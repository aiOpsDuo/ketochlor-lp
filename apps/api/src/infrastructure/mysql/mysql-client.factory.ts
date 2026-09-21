import mysql, { type Pool } from 'mysql2/promise';
import type { MysqlEnv } from '../config/mysql-env';

/**
 * Cria o POOL de conexão MySQL do lado do servidor, autenticado com o
 * usuário de aplicação (`MysqlEnv.user` — nunca `root`, ver `mysql-env.ts`).
 * Um pool, não uma conexão única: a API atende requisições concorrentes
 * (SDD § Camadas e padrão arquitetural). Único ponto do código que
 * instancia o driver `mysql2` — todo repositório de Infraestrutura recebe
 * este pool por injeção, nunca cria o seu próprio (mesmo padrão de
 * `supabase-client.factory.ts`).
 */
export function criarMysqlPool(env: MysqlEnv): Pool {
  return mysql.createPool({
    host: env.host,
    port: env.port,
    database: env.database,
    user: env.user,
    password: env.password,
    // `dateStrings: true`: devolve DATETIME/TIMESTAMP como string
    // (`YYYY-MM-DD HH:MM:SS`) em vez de um `Date` no fuso horário local do
    // processo Node — os adaptadores devolvem ISO 8601 explicitamente (ver
    // `content-sections.repository.ts`/`leads.repository.ts`), então
    // controlar a conversão na aplicação evita depender do fuso horário do
    // ambiente onde a API roda (SDD § Modelo de dados: "timestamptz ->
    // DATETIME em UTC, padronizado na aplicação").
    dateStrings: true,
    waitForConnections: true,
    connectionLimit: 10,
  });
}
