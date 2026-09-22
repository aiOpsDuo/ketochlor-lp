-- Cria a tabela site_metadata como registro único (sem coluna de URL
-- canônica). Ref.: agent_context/SDD.md § Modelo de dados > site_metadata.
--
-- id BOOLEAN PK + CHECK(id) do Postgres original vira
-- TINYINT(1) PRIMARY KEY DEFAULT 1 CHECK (id = 1) — suportado desde MySQL
-- 8.0.16 (CHECK constraints passaram a ser de fato aplicadas, não só
-- aceitas e ignoradas). `title`/`description` seguem TEXT (sem limite
-- arbitrário de tamanho), mesmo tipo do `text` do Postgres original —
-- diferente de `og_image_url`, que o SDD já define com um teto explícito
-- (VARCHAR(2048), mesma convenção usada pelas outras colunas de URL deste
-- schema).
--
-- Já nasce com og_image_url (não og_image_media_id) — ver SDD § Modelo de
-- dados, nota "Correção de og_image_media_id -> og_image_url".
CREATE TABLE IF NOT EXISTS site_metadata (
  id TINYINT(1) NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  og_image_url VARCHAR(2048) NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by CHAR(36) NULL,
  PRIMARY KEY (id),
  CONSTRAINT site_metadata_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- INSERT IGNORE: mesma razão de segurança em reexecução do arquivo 0001
-- (a chave primária fixa `id = 1` já garante o singleton).
INSERT IGNORE INTO site_metadata (id, title, description) VALUES (1, '', '');
