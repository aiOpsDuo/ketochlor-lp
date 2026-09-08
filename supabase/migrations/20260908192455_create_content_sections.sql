-- Cria a tabela content_sections e semeia as 11 seções fechadas da LP.
-- Ref.: agent_context/SDD.md § Modelo de dados > content_sections
create table content_sections (
  key text primary key,
  data jsonb not null default '{}'::jsonb,
  is_published boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

insert into content_sections (key, data, is_published) values
  ('hero', '{}'::jsonb, true),
  ('problema', '{}'::jsonb, true),
  ('fenotipos', '{}'::jsonb, true),
  ('mecanismo', '{}'::jsonb, true),
  ('tecnologia_sis', '{}'::jsonb, true),
  ('prova_autoridade', '{}'::jsonb, true),
  ('protocolo', '{}'::jsonb, true),
  ('diferenciais', '{}'::jsonb, true),
  ('material_tecnico', '{}'::jsonb, true),
  ('cta_secundario', '{}'::jsonb, true),
  ('faq', '{}'::jsonb, true);
