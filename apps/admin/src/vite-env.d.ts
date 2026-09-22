/// <reference types="vite/client" />

// Desde a tarefa `ajustes/migracao-mysql-painel-auth-e-upload` (SDD §
// "Migração de plataforma de dados" → Painel), o painel não lê nenhuma
// variável `VITE_*` própria: fala com a API sempre por caminho relativo
// (`/api/*`, mesmo domínio em dev via proxy do Vite e em produção via
// nginx — SDD § "Ponto único de entrada"), sem precisar de URL própria do
// MinIO nem de chave de Supabase. `ImportMetaEnv`/`ImportMeta` já vêm do
// `vite/client` acima — nenhuma extensão é necessária hoje.
