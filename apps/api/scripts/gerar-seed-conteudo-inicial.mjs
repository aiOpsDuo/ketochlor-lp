#!/usr/bin/env node
// Gera `supabase/seed.sql` a partir de `CONTENT_SECTIONS`
// (`@ketochlor/content-schema`) — a fonte única do conteúdo inicial real das
// 11 seções da LP (ver `packages/content-schema/src/index.ts`).
//
// Por que este script mora em `apps/api/scripts` e não na raiz do monorepo:
// só `apps/api` já declara `@ketochlor/content-schema` como dependência de
// runtime (`apps/api/package.json`); resolver o pacote a partir daqui evita
// duplicar essa dependência num `package.json` novo na raiz só para este
// script.
//
// Pré-requisito: `packages/content-schema` precisa estar compilado
// (`npm run build --workspace=@ketochlor/content-schema`, ou
// `npm run build --workspaces --if-present`) — este script importa o pacote
// pelo `dist/` publicado, igual a qualquer outro consumidor dele.
//
// Ref.: agent_context/PLAN.md, tarefa `integracao/migracao-conteudo-inicial`.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '../../..');
const SEED_PATH = resolve(REPO_ROOT, 'supabase/seed.sql');

/**
 * Escapa uma string para uso dentro de um literal `'...'` do Postgres,
 * dobrando aspas simples (`'` → `''`) — a única regra de escape que o SQL
 * padrão exige nesse contexto.
 */
function paraLiteralSql(valor) {
  return valor.replace(/'/g, "''");
}

function paraLiteralJsonb(conteudo) {
  return `'${paraLiteralSql(JSON.stringify(conteudo))}'::jsonb`;
}

function montarSeedSql(secoes) {
  const linhasValues = Object.entries(secoes)
    .map(([key, { initialContent }]) => `  ('${key}', ${paraLiteralJsonb(initialContent)})`)
    .join(',\n');

  return `-- Gerado automaticamente por \`apps/api/scripts/gerar-seed-conteudo-inicial.mjs\`
-- a partir de \`CONTENT_SECTIONS\` (@ketochlor/content-schema). NÃO EDITE
-- ESTE ARQUIVO À MÃO — mude o conteúdo em \`packages/content-schema/src/sections/*.ts\`
-- e rode de novo:
--
--   npm run gerar-seed --workspace=@ketochlor/api
--
-- O Supabase CLI roda \`supabase/seed.sql\` automaticamente ao final de todo
-- \`supabase db reset\` (https://supabase.com/docs/guides/local-development/seeding-your-database),
-- depois de aplicar as migrations em \`supabase/migrations/\` — este arquivo
-- preenche com o conteúdo real as 11 linhas de \`content_sections\` que a
-- migration \`20260908192455_create_content_sections.sql\` cria com
-- \`data = '{}'::jsonb\`.
--
-- \`ON CONFLICT ... DO UPDATE\` (em vez de um \`INSERT\` simples) faz deste
-- script uma operação idempotente: rodar \`supabase db reset\` de novo, ou
-- reexecutar este \`seed.sql\` num banco que já tem as linhas, atualiza
-- \`data\` no lugar em vez de duplicar linha ou falhar por violação da chave
-- primária \`key\`. Só a coluna \`data\` é tocada — \`is_published\` e
-- \`item_visibility\` (edições feitas pelo painel) não são sobrescritas.
--
-- Ref.: agent_context/PLAN.md, tarefa \`integracao/migracao-conteudo-inicial\`.

insert into content_sections (key, data) values
${linhasValues}
on conflict (key) do update
  set data = excluded.data,
      updated_at = now();
`;
}

async function main() {
  const { CONTENT_SECTIONS } = await import('@ketochlor/content-schema');
  const seedSql = montarSeedSql(CONTENT_SECTIONS);
  await writeFile(SEED_PATH, seedSql, 'utf8');
  console.log(`seed.sql gerado com ${Object.keys(CONTENT_SECTIONS).length} seções em ${SEED_PATH}`);
}

main().catch((erro) => {
  console.error('Falha ao gerar supabase/seed.sql:', erro);
  process.exitCode = 1;
});
