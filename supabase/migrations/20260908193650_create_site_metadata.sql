-- Cria a tabela site_metadata como registro único (sem coluna de URL canônica).
-- Ref.: agent_context/SDD.md § Modelo de dados > site_metadata
create table site_metadata (
  id boolean primary key default true,
  title text not null default '',
  description text not null default '',
  og_image_media_id uuid,
  updated_at timestamptz not null default now(),
  updated_by uuid,
  constraint site_metadata_singleton check (id)
);

insert into site_metadata (id) values (true);
