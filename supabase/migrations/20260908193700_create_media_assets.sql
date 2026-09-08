-- Cria a tabela media_assets (um registro por imagem enviada).
-- Sem coluna `kind`: esta versão do Ketochlor não tem vídeo (PRD § Fora de escopo).
-- Ref.: agent_context/SDD.md § Modelo de dados > media_assets
create table media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null,
  public_url text not null,
  mime_type text not null,
  size_bytes bigint not null,
  original_filename text not null,
  width integer,
  height integer,
  created_at timestamptz not null default now(),
  created_by uuid
);
