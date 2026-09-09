import { supabase } from '../lib/supabase-client'

export function DashboardPage() {
  async function handleLogout() {
    await supabase.auth.signOut()
    // `onAuthStateChange` (auth-context) limpa a sessão e `ProtectedRoute`
    // redireciona ao login — nenhuma navegação manual é necessária aqui.
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold">Painel Ketochlor</h1>
      <p className="max-w-md text-gray-600">
        Sessão autenticada. A listagem de seções chega na tarefa
        `painel/listagem-secoes`.
      </p>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700"
      >
        Sair
      </button>
    </main>
  )
}
