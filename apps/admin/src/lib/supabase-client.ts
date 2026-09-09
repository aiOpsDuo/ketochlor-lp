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
// conteúdo ou leads, que só a API (`apps/api`) alcança.
//
// Exceção deliberada (`painel/formulario-edicao-secao`): o upload de imagem
// usa este MESMO cliente para falar com o Storage
// (`lib/media-upload.ts`, `uploadToSignedUrl`/`getPublicUrl`) — é exatamente
// o fluxo documentado em `docs/API.md` § Mídia ("o painel usa signedUrl/
// token com o SDK do Supabase Storage"). A chave publicável não dá acesso de
// escrita nenhum por si só: quem autoriza o upload é a credencial temporária
// emitida por `POST /api/admin/media/upload-url` (API), não este cliente.
//
// `persistSession`/`autoRefreshToken` já são `true` por padrão no SDK
// (armazenamento em `localStorage` do navegador) — nenhuma configuração
// extra é necessária para a sessão sobreviver a um recarregamento de
// página.
export const supabase = createClient(supabaseUrl, supabasePublishableKey)
