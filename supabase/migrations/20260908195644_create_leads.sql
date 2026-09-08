-- Cria a tabela leads (um registro por envio do formulário de Material Técnico).
-- Sem coluna de aceite LGPD: o consentimento é condição de envio, recusado com 422
-- pela API antes de qualquer gravação — não é um dado a persistir.
-- Ref.: agent_context/SDD.md § Modelo de dados > leads
create table leads (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  email text not null,
  telefone text,
  crmv text,
  estado_cidade text,
  especialidade text,
  ja_cliente_virbac boolean not null default false,
  deseja_contato_comercial boolean not null default false,
  origem text,
  created_at timestamptz not null default now()
);
