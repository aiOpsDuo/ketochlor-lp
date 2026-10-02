-- Adiciona a `leads` o registro do consentimento LGPD (aceite + quando + o
-- texto exibido + a URL da política em vigor). Substitui a decisão original
-- de não persistir o aceite (0004_create_leads.sql): a pedido do cliente
-- (2026-10-02), o Marketing precisa do registro no banco para gerir a base e
-- excluir leads em caso de revogação. Sem IP/user-agent (decisão com o
-- cliente).
-- Ref.: agent_context/SDD.md § Modelo de dados > leads;
--       agent_context/CHANGELOG.md, 2026-10-02.
--
-- `consentimento_em` é sempre o relógio do servidor (UTC, mesmo padrão de
-- `created_at`), nunca um horário enviado pelo cliente.
-- `consentimento_politica_url` é gravada pela API a partir de
-- `POLITICA_PRIVACIDADE_URL` (`@ketochlor/content-schema`), nunca do corpo
-- da requisição.
--
-- Idempotência dentro do arquivo (mesmo raciocínio do `INSERT IGNORE` de
-- 0001_create_content_sections.sql — o caso de este arquivo rodar sem estar
-- registrado em `schema_migrations`): o MySQL 8 não tem
-- `ADD COLUMN IF NOT EXISTS`, então o `ALTER TABLE` é montado condicionalmente
-- a partir de `information_schema`. Um único `ALTER` com as 4 colunas é
-- atômico no InnoDB do MySQL 8 (DDL atômico) — ou existem as 4, ou nenhuma.
-- Só "já existem as 4" vira no-op; qualquer estado parcial (coluna criada à
-- mão, fora deste arquivo) cai no `ALTER` e falha alto com "Duplicate column",
-- em vez de seguir em silêncio com um schema incompleto.
SET @colunas_consentimento_existentes := (
  SELECT COUNT(*)
  FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'leads'
    AND COLUMN_NAME IN (
      'consentimento_aceito',
      'consentimento_em',
      'consentimento_texto',
      'consentimento_politica_url'
    )
);

SET @ddl_consentimento := IF(
  @colunas_consentimento_existentes = 4,
  'DO 0',
  'ALTER TABLE leads
     ADD COLUMN consentimento_aceito BOOLEAN NOT NULL DEFAULT FALSE AFTER origem,
     ADD COLUMN consentimento_em DATETIME NULL AFTER consentimento_aceito,
     ADD COLUMN consentimento_texto VARCHAR(500) NULL AFTER consentimento_em,
     ADD COLUMN consentimento_politica_url VARCHAR(500) NULL AFTER consentimento_texto'
);

PREPARE adicionar_colunas_consentimento FROM @ddl_consentimento;
EXECUTE adicionar_colunas_consentimento;
DEALLOCATE PREPARE adicionar_colunas_consentimento;

-- Backfill: todo lead já existente necessariamente aceitou a política — a API
-- sempre recusou (422) qualquer envio sem `consentimentoAceito === true`
-- antes de gravar (`validarLead`). Por isso `consentimento_em` herda
-- `created_at`. `consentimento_texto`/`consentimento_politica_url` ficam
-- NULL = desconhecido para essas linhas legadas (nunca foram registrados).
-- Seguro de rodar de novo: depois desta migration a API só grava
-- `consentimento_aceito = TRUE`, então o filtro não encontra mais nada.
UPDATE leads
SET consentimento_aceito = TRUE,
    consentimento_em = created_at
WHERE consentimento_aceito = FALSE;
