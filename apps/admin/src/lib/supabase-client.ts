import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY são obrigatórias — copie apps/admin/.env.example para apps/admin/.env.',
  )
}

// Cliente único do painel (SDD § Contratos de dados/API/interfaces →
// Autenticação): o painel fala com o Supabase Auth diretamente, via SDK
// cliente e chave publicável, para login/sessão — nunca para ler ou gravar
// conteúdo, mídia ou leads, que só a API (`apps/api`) alcança.
//
// `persistSession`/`autoRefreshToken` já são `true` por padrão no SDK
// (armazenamento em `localStorage` do navegador) — nenhuma configuração
// extra é necessária para a sessão sobreviver a um recarregamento de
// página.
export const supabase = createClient(supabaseUrl, supabasePublishableKey)
