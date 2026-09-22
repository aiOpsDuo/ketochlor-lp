#!/usr/bin/env node
// Gera `apps/api/mysql/seed.sql` a partir de `CONTENT_SECTIONS`
// (`@ketochlor/content-schema`) — equivalente MySQL de
// `apps/api/scripts/gerar-seed-conteudo-inicial.mjs` (que gera
// `supabase/seed.sql`, hoje só usado pelo Supabase CLI local).
//
// Por que um script próprio em vez de adaptar o gerador do Supabase para
// aceitar um "dialeto" de saída: os dois SQLs divergem em mais do que um
// parâmetro de formatação — Postgres usa `'...'::jsonb` + `insert ... on
// conflict (key) do update`, MySQL usa um literal de string simples (o
// próprio driver valida contra a coluna `JSON`) + `update ... where` (a
// tabela já nasce com as 11 linhas via
// `apps/api/mysql/migrations/0001_create_content_sections.sql`, então não
// há upsert a fazer aqui, só atualizar `data`). Parametrizar um único
// gerador para as duas gramáticas exigiria mais ramificação condicional do
// que duplicar as ~20 linhas que de fato diferem — a mesma régua de
// proporcionalidade de SOLID (OCP): dois scripts pequenos e diretos, cada
// um só de um dialeto, são mais fáceis de ler e manter do que um script
// genérico com `if (dialeto === 'postgres')` espalhado.
//
// Pré-requisito: `packages/content-schema` precisa estar compilado
// (`npm run build --workspace=@ketochlor/content-schema`, ou
// `npm run build --workspaces --if-present`) — este script importa o pacote
// pelo `dist/` publicado, igual ao gerador do Supabase.
//
// Ref.: agent_context/PLAN.md, tarefa `ajustes/migracao-mysql-dados-homologacao`.

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '../../..');
const SEED_PATH = resolve(REPO_ROOT, 'apps/api/mysql/seed.sql');

/**
 * `site_metadata.title`/`.description` real do Ketochlor. Nem a migration
 * `apps/api/mysql/migrations/0002_create_site_metadata.sql` nem seu
 * equivalente Postgres original (`supabase/migrations/
 * 20260908193650_create_site_metadata.sql`) nunca gravaram esses campos com
 * conteúdo real — as duas só criam o registro único com `title`/
 * `description` vazios (`''`), e `supabase/seed.sql` nunca tocou
 * `site_metadata` (só semeia `content_sections`). O conteúdo real de SEO do
 * Ketochlor nunca foi "portado" para o CMS depois da migração da LP
 * estática — continua, inalterado desde o primeiro commit do projeto
 * (`d2bc47b`, "Primeira versão da Landing Page Ketochlor"), no `<title>`/
 * `<meta name="description">` de `apps/lp/index.html`. Copiado aqui ao pé
 * da letra como a fonte de verdade real, não um placeholder novo.
 */
const SITE_METADATA_TITLE = 'Ketochlor® | Virbac — Material técnico para médicos-veterinários';
const SITE_METADATA_DESCRIPTION =
  'Ketochlor®: indicação, mecanismo de dupla ação e tecnologia SIS para infecções secundárias de pele em cães. Acesse o material técnico completo.';

/**
 * Escapa uma string para uso dentro de um literal `'...'` do MySQL — dobra
 * barras invertidas primeiro (senão uma dobraria a barra já duplicada pelo
 * `JSON.stringify` de conteúdo com `\"`/`\\`), depois aspas simples. O
 * conteúdo atual de `CONTENT_SECTIONS` não tem nenhum caractere de escape,
 * mas a função trata o caso geral em vez de confiar nisso permanecer assim
 * (Código Limpo, G3 — condição de contorno explícita, não implícita).
 */
function paraLiteralSqlMysql(valor) {
  return valor.replace(/\\/g, '\\\\').replace(/'/g, "''");
}

function paraLiteralJson(conteudo) {
  return `'${paraLiteralSqlMysql(JSON.stringify(conteudo))}'`;
}

/** Literal `'...'` de texto simples (colunas `TEXT`, não `JSON`) — usado só por `site_metadata`. */
function paraLiteralTexto(valor) {
  return `'${paraLiteralSqlMysql(valor)}'`;
}

function montarUpdatesDeSecoes(secoes) {
  return Object.entries(secoes)
    .map(
      ([key, { initialContent }]) =>
        `UPDATE content_sections SET data = ${paraLiteralJson(initialContent)}, updated_at = UTC_TIMESTAMP() WHERE \`key\` = '${key}';`,
    )
    .join('\n');
}

function montarSeedSql(secoes) {
  const updatesDeSecoes = montarUpdatesDeSecoes(secoes);

  return `-- Gerado automaticamente por \`apps/api/scripts/gerar-seed-mysql.mjs\`
-- a partir de \`CONTENT_SECTIONS\` (@ketochlor/content-schema). NÃO EDITE
-- ESTE ARQUIVO À MÃO — mude o conteúdo em
-- \`packages/content-schema/src/sections/*.ts\` (para as seções) ou nas
-- constantes \`SITE_METADATA_*\` do próprio gerador (para os metadados de
-- SEO) e rode de novo:
--
--   npm run gerar-seed:mysql --workspace=@ketochlor/api
--
-- Diferente das migrations em \`apps/api/mysql/migrations/\` (aplicadas uma
-- vez, em ordem, pelo runner \`scripts/migrar-mysql.mjs\`), este arquivo é
-- uma carga de dados pontual — mesmo papel que \`supabase/seed.sql\` tinha
-- para o Postgres/Supabase CLI local. Rode manualmente contra o \`mysql\` do
-- \`docker-compose.yml\` depois que as migrations já tiverem criado o
-- schema, por exemplo:
--
--   docker compose exec -T mysql mysql --default-character-set=utf8mb4 \\
--     -u root -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" < apps/api/mysql/seed.sql
--
-- \`--default-character-set=utf8mb4\` NÃO é opcional: o cliente \`mysql\`
-- desta imagem assume \`latin1\` por padrão para \`character_set_client\`/
-- \`character_set_connection\` (\`SHOW VARIABLES LIKE 'character_set%'\`),
-- mesmo com \`character_set_server\`/\`character_set_database\` em
-- \`utf8mb4\` — sem essa flag, cada byte UTF-8 deste arquivo (acentos, "®",
-- travessão) é reinterpretado como um caractere Latin-1 e regravado como
-- utf8mb4, produzindo mojibake persistido na coluna (ex.: "Ketochlor®"
-- virando "KetochlorÂ®") — confirmado de verdade rodando sem a flag,
-- inspecionando os bytes gravados (\`SELECT HEX(...)\`) e comparando com o
-- resultado depois de reexecutar com a flag.
--
-- As 11 linhas de \`content_sections\` já existem (a migration
-- \`0001_create_content_sections.sql\` as cria com \`data = '{}'\`) — por
-- isso cada seção usa um \`UPDATE ... WHERE \`key\` = ...\` simples, não um
-- \`INSERT\`. Só a coluna \`data\` é tocada — \`item_visibility\` e
-- \`is_published\` (edições feitas pelo painel) não são sobrescritas, mesmo
-- contrato do gerador Postgres original (\`gerar-seed-conteudo-inicial.mjs\`).
-- Rodar este arquivo de novo é seguro (idempotente): cada \`UPDATE\` grava o
-- mesmo valor, não duplica nem falha.

${updatesDeSecoes}

-- \`site_metadata\` (registro único, \`id = 1\`) também já existe (migration
-- \`0002_create_site_metadata.sql\` o cria com \`title\`/\`description\`
-- vazios) — mesmo padrão de \`UPDATE\` das seções acima.
UPDATE site_metadata
  SET title = ${paraLiteralTexto(SITE_METADATA_TITLE)}, description = ${paraLiteralTexto(SITE_METADATA_DESCRIPTION)}
  WHERE id = 1;
`;
}

async function main() {
  const { CONTENT_SECTIONS } = await import('@ketochlor/content-schema');
  const seedSql = montarSeedSql(CONTENT_SECTIONS);
  await writeFile(SEED_PATH, seedSql, 'utf8');
  console.log(`seed.sql gerado com ${Object.keys(CONTENT_SECTIONS).length} seções em ${SEED_PATH}`);
}

main().catch((erro) => {
  console.error('Falha ao gerar apps/api/mysql/seed.sql:', erro);
  process.exitCode = 1;
});
