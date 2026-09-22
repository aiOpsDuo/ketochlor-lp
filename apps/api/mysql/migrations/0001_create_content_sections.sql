-- Cria a tabela content_sections e semeia as 11 seções fechadas da LP.
-- Ref.: agent_context/SDD.md § Modelo de dados > content_sections.
--
-- Tipos escolhidos (ver SDD § "Migração de plataforma de dados"): JSON
-- nativo para `data`/`item_visibility`, CHAR(36) para uuid (gerado na
-- aplicação), DATETIME em UTC para timestamp (padronizado na aplicação).
--
-- item_visibility é gravada na MESMA instrução UPDATE que data pelo
-- repositório de infraestrutura (contrato da porta
-- ContentSectionsRepository.atualizarConteudo) — nunca duas queries
-- independentes, para as duas nunca ficarem dessincronizadas.
CREATE TABLE IF NOT EXISTS content_sections (
  `key` VARCHAR(64) NOT NULL,
  data JSON NOT NULL,
  item_visibility JSON NOT NULL,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by CHAR(36) NULL,
  PRIMARY KEY (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- INSERT IGNORE (em vez de INSERT simples): torna o seed das 11 linhas
-- seguro de rodar de novo mesmo fora do controle do runner (ex.: reexecução
-- manual de um arquivo já aplicado, ou um processo interrompido depois do
-- CREATE TABLE mas antes de `schema_migrations` registrar este arquivo) —
-- uma linha cujo `key` já existe é silenciosamente ignorada, nunca gera
-- erro de chave primária duplicada.
INSERT IGNORE INTO content_sections (`key`, data, item_visibility, is_published) VALUES
  ('hero', '{}', '{}', TRUE),
  ('problema', '{}', '{}', TRUE),
  ('fenotipos', '{}', '{}', TRUE),
  ('mecanismo', '{}', '{}', TRUE),
  ('tecnologia_sis', '{}', '{}', TRUE),
  ('prova_autoridade', '{}', '{}', TRUE),
  ('protocolo', '{}', '{}', TRUE),
  ('diferenciais', '{}', '{}', TRUE),
  ('material_tecnico', '{}', '{}', TRUE),
  ('cta_secundario', '{}', '{}', TRUE),
  ('faq', '{}', '{}', TRUE);
