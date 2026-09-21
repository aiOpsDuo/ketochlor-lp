-- Cria a tabela media_assets (um registro por imagem enviada).
-- Sem coluna `kind`: esta versão do Ketochlor não tem vídeo (PRD § Fora de
-- escopo). Ref.: agent_context/SDD.md § Modelo de dados > media_assets.
--
-- `id` é CHAR(36) (não AUTO_INCREMENT): o UUID é gerado na aplicação
-- (`randomUUID()` do Node), mesmo padrão já usado pelo adaptador Supabase
-- de mídia — preservado na migração para não mudar o formato do
-- identificador referenciado pelos documentos de seção.
CREATE TABLE IF NOT EXISTS media_assets (
  id CHAR(36) NOT NULL,
  storage_path VARCHAR(1024) NOT NULL,
  public_url VARCHAR(2048) NOT NULL,
  mime_type VARCHAR(255) NOT NULL,
  size_bytes BIGINT NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  width INT NULL,
  height INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by CHAR(36) NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
