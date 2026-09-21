import { createPool, type Pool } from 'mysql2/promise';
import type { MysqlEnv } from '../config/mysql-env';

/**
 * Cria o POOL de conexão MySQL do lado do servidor, autenticado com o
 * usuário de aplicação (`MysqlEnv.user` — nunca `root`, ver `mysql-env.ts`).
 * Um pool, não uma conexão única: a API atende requisições concorrentes
 * (SDD § Camadas e padrão arquitetural). Único ponto do código que
 * instancia o driver `mysql2` — todo repositório de Infraestrutura recebe
 * este pool por injeção, nunca cria o seu próprio.
 *
 * Import NOMEADO (`{ createPool }`), nunca `import mysql from 'mysql2/
 * promise'` (bug real encontrado na tarefa `ajustes/migracao-mysql-cutover-
 * wiring`, verificado com `docker compose up --build api`): `mysql2/
 * promise` é um módulo CommonJS puro (`module.exports.createPool`, sem
 * `.default`); `tsconfig.json` deste projeto tem `allowSyntheticDefaultImports:
 * true` mas NÃO `esModuleInterop: true`, então o `tsc` (usado por `nest
 * build`) compila `import mysql from 'mysql2/promise'` para
 * `promise_1.default.createPool(...)` sem sintetizar o `.default` em
 * runtime — `promise_1.default` é `undefined`, e a chamada falha com
 * `TypeError: Cannot read properties of undefined (reading 'createPool')`.
 * O bug não aparecia nos testes (vitest/esbuild sintetiza `.default`
 * silenciosamente, mascarando a divergência), só no container real, contra
 * o `dist/` gerado por `tsc` — daí a importância de testar o build de
 * produção de verdade, não só a suíte de testes.
 */
export function criarMysqlPool(env: MysqlEnv): Pool {
  return createPool({
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
