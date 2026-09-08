-- Habilita Row Level Security nas quatro tabelas do CMS, sem nenhuma policy
-- permissiva para os papéis anon/authenticated: nenhum cliente alcança o banco
-- diretamente, todo acesso passa pela API usando a chave secreta do lado do
-- servidor (service_role, que ignora RLS por padrão).
-- Ref.: agent_context/SDD.md § Modelo de dados > Row Level Security
alter table content_sections enable row level security;
alter table site_metadata enable row level security;
alter table media_assets enable row level security;
alter table leads enable row level security;

-- Bucket de Storage para as imagens do CMS. Público apenas para LEITURA de
-- arquivo já publicado (a landing page lê conteúdo sem autenticação, ver
-- SDD/PRD); escrita não é liberada por policy para anon/authenticated — o
-- upload direto do navegador (SDD § Decisões técnicas e trade-offs) é
-- autorizado por uma credencial temporária emitida pela API, não por uma
-- policy permanente aberta.
insert into storage.buckets (id, name, public) values ('images', 'images', true);

create policy "images_public_read"
  on storage.objects for select
  to public
  using (bucket_id = 'images');
