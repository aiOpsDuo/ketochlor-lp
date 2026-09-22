-- Cria a tabela operators (um registro por operador do painel).
-- Ref.: agent_context/SDD.md § Modelo de dados > operators;
--       § "Migração de plataforma de dados" (Autenticação).
--
-- `id` é o mesmo valor usado como `sub` do JWT emitido em
-- POST /api/auth/login (módulo de autenticação própria) — gerado na
-- aplicação, mesmo padrão de UUID de `media_assets`/`leads`. `senha_hash`
-- nunca guarda senha em texto plano
-- (bcryptjs). `ultimo_login_em` é nulável: só é escrita no primeiro login
-- bem-sucedido, um operador recém-criado ainda não tem valor.
CREATE TABLE IF NOT EXISTS operators (
  id CHAR(36) NOT NULL,
  email VARCHAR(255) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  criado_em DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ultimo_login_em DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY operators_email_unique (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
