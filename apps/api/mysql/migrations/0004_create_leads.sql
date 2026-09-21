-- Cria a tabela leads (um registro por envio do formulário de Material
-- Técnico). Sem coluna de aceite LGPD: o consentimento é condição de envio,
-- recusado com 422 pela API antes de qualquer gravação — não é um dado a
-- persistir (ver SDD § Modelo de dados > leads, "Por que não existe coluna
-- aceite_lgpd").
-- Ref.: agent_context/SDD.md § Modelo de dados > leads.
CREATE TABLE IF NOT EXISTS leads (
  id CHAR(36) NOT NULL,
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  telefone VARCHAR(255) NULL,
  crmv VARCHAR(255) NULL,
  estado_cidade VARCHAR(255) NULL,
  especialidade VARCHAR(255) NULL,
  ja_cliente_virbac BOOLEAN NOT NULL DEFAULT FALSE,
  deseja_contato_comercial BOOLEAN NOT NULL DEFAULT FALSE,
  origem VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
