// Camada de Infraestrutura da API (SDD § Camadas e padrão arquitetural —
// Infraestrutura). Adaptadores que implementam as portas do Domínio contra o
// Supabase; depende do Domínio, nunca o contrário.

export * from './config/supabase-env';
export * from './supabase/supabase-client.factory';
export * from './supabase/content-sections.repository';
export * from './supabase/site-metadata.repository';
export * from './supabase/media-assets.repository';
export * from './supabase/leads.repository';
export * from './supabase/operadores.repository';
export * from './auth/jwks-token-verificador';
