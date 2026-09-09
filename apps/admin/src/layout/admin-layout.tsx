import { NavLink, Outlet } from 'react-router-dom'
import { supabase } from '../lib/supabase-client'

/**
 * Links de navegação do painel. `/metadata` e `/leads` ainda não têm página
 * própria (chegam nas tarefas `painel/tela-metadados` e `painel/tela-leads`)
 * — o link já existe aqui de propósito, para essas tarefas só precisarem
 * registrar a rota em `App.tsx`, sem tocar neste componente.
 */
const LINKS_DE_NAVEGACAO = [
  { rota: '/', rotulo: 'Seções' },
  { rota: '/metadata', rotulo: 'Metadados' },
  { rota: '/leads', rotulo: 'Leads' },
] as const

/**
 * Layout compartilhado de toda rota protegida do painel (SDD § "Painel de
 * edição por seção"): cabeçalho fixo com o nome do painel, a navegação
 * entre as três áreas e o botão de sair — registrado em `App.tsx` como
 * elemento pai das rotas sob `<ProtectedRoute />`, com `<Outlet />`
 * renderizando a página de cada rota filha.
 */
export function AdminLayout() {
  async function handleLogout() {
    await supabase.auth.signOut()
    // `onAuthStateChange` (auth-context) limpa a sessão e `ProtectedRoute`
    // redireciona ao login — nenhuma navegação manual é necessária aqui.
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
        <div className="flex items-center gap-6">
          <span className="text-lg font-semibold text-gray-900">Painel Ketochlor</span>
          <nav className="flex gap-4 text-sm">
            {LINKS_DE_NAVEGACAO.map((link) => (
              <NavLink
                key={link.rota}
                to={link.rota}
                end={link.rota === '/'}
                className={({ isActive }) =>
                  isActive ? 'font-semibold text-gray-900' : 'text-gray-500 hover:text-gray-900'
                }
              >
                {link.rotulo}
              </NavLink>
            ))}
          </nav>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700"
        >
          Sair
        </button>
      </header>
      <main className="p-6">
        <Outlet />
      </main>
    </div>
  )
}
