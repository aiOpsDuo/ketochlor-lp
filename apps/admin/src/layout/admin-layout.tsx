import {
  LayoutList,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Tags,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../auth/auth-context'
import { supabase } from '../lib/supabase-client'
import { classeDeBotao } from '../shared/classes'

/**
 * Links de navegação do painel. Renderizados por `<NavegacaoDoPainel />` — uma
 * única lista, um único componente, usados TANTO pela barra lateral de desktop
 * quanto pela gaveta de mobile: duplicar o markup em dois lugares é como um
 * link novo passa a existir só em uma das duas.
 */
const LINKS_DE_NAVEGACAO: { rota: string; rotulo: string; icone: LucideIcon }[] = [
  { rota: '/', rotulo: 'Seções', icone: LayoutList },
  { rota: '/metadata', rotulo: 'Metadados', icone: Tags },
  { rota: '/leads', rotulo: 'Leads', icone: Users },
]

const CHAVE_SIDEBAR_RECOLHIDA = 'ketochlor.painel.sidebar-recolhida'

/**
 * Estado de "barra lateral recolhida", lembrado entre visitas. É uma
 * preferência de conveniência por navegador, não dado do CMS — daí
 * `localStorage` e não a API. Leitura e escrita em `try/catch` porque o
 * acessador em si pode lançar (janela privada, cookies de site bloqueados);
 * nesse caso o painel abre expandido, que é o padrão.
 */
function lerSidebarRecolhida(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_SIDEBAR_RECOLHIDA) === 'true'
  } catch {
    return false
  }
}

function gravarSidebarRecolhida(recolhida: boolean): void {
  try {
    window.localStorage.setItem(CHAVE_SIDEBAR_RECOLHIDA, String(recolhida))
  } catch {
    // Preferência visual: se o navegador não deixa persistir, seguir sem ela.
  }
}

/**
 * Layout compartilhado de toda rota protegida do painel (SDD § "Painel de
 * edição por seção"): barra lateral fixa com a navegação entre as três áreas,
 * cabeçalho sempre visível com o e-mail do operador e o botão de sair, e o
 * conteúdo da rota filha centralizado com largura máxima de leitura.
 *
 * Registrado em `App.tsx` como elemento pai das rotas sob `<ProtectedRoute />`
 * — uma área nova do painel só precisa de um `<Route>` lá e de uma entrada em
 * `LINKS_DE_NAVEGACAO`, sem tocar na estrutura daqui.
 */
export function AdminLayout() {
  const { session } = useAuth()
  const [recolhida, setRecolhida] = useState(lerSidebarRecolhida)
  const [gavetaAberta, setGavetaAberta] = useState(false)
  const { pathname } = useLocation()

  // Navegar fecha a gaveta de mobile: ela cobre o conteúdo, então deixá-la
  // aberta sobre a tela recém-carregada esconderia justamente o que o
  // operador acabou de pedir.
  useEffect(() => {
    setGavetaAberta(false)
  }, [pathname])

  function alternarRecolhida() {
    setRecolhida((atual) => {
      gravarSidebarRecolhida(!atual)
      return !atual
    })
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    // `onAuthStateChange` (auth-context) limpa a sessão e `ProtectedRoute`
    // redireciona ao login — nenhuma navegação manual é necessária aqui.
  }

  const larguraDaLateral = recolhida ? 'lg:w-[4.75rem]' : 'lg:w-64'
  const recuoDoConteudo = recolhida ? 'lg:pl-[4.75rem]' : 'lg:pl-64'

  return (
    <div className="min-h-screen bg-lighttint">
      {/* Barra lateral — desktop */}
      <aside
        className={`hidden border-r border-cardborder bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:flex-col ${larguraDaLateral}`}
      >
        <MarcaDoPainel recolhida={recolhida} />
        <NavegacaoDoPainel somenteIcones={recolhida} />
        <div className="border-t border-cardborder p-3">
          <button
            type="button"
            onClick={alternarRecolhida}
            aria-expanded={!recolhida}
            aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}
            className={classeDeBotao('secundario', 'pequeno', 'w-full')}
          >
            {recolhida ? (
              <PanelLeftOpen aria-hidden="true" className="h-4 w-4" />
            ) : (
              <>
                <PanelLeftClose aria-hidden="true" className="h-4 w-4" />
                Recolher menu
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Barra lateral — mobile, como gaveta sobre o conteúdo */}
      {gavetaAberta && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={() => setGavetaAberta(false)}
            className="absolute inset-0 bg-navy/40"
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-cardborder bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-cardborder px-4 py-4">
              <span className="font-semibold text-navy">Painel Ketochlor</span>
              <button
                type="button"
                onClick={() => setGavetaAberta(false)}
                aria-label="Fechar menu"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <NavegacaoDoPainel somenteIcones={false} />
          </div>
        </div>
      )}

      <div className={recuoDoConteudo}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-cardborder bg-white/85 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setGavetaAberta(true)}
            aria-label="Abrir menu"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
          <span className="font-semibold text-navy">Painel Ketochlor</span>
          <div className="ml-auto flex items-center gap-3">
            {session?.user.email && (
              <span className="hidden text-sm text-graytxt sm:inline">{session.user.email}</span>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className={classeDeBotao('secundario', 'pequeno')}
            >
              <LogOut aria-hidden="true" className="h-4 w-4" />
              Sair
            </button>
          </div>
        </header>

        <main className="px-4 py-8 sm:px-6">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function MarcaDoPainel({ recolhida }: { recolhida: boolean }) {
  return (
    <div className="flex h-16 items-center gap-2 border-b border-cardborder px-4">
      {/* Bloco na cor âncora da marca — a única presença de cor "cheia" da
          marca no painel, no lugar de um logo que o painel não precisa. */}
      <span
        aria-hidden="true"
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy text-sm font-bold text-white"
      >
        K
      </span>
      {!recolhida && <span className="truncate font-semibold text-navy">Ketochlor</span>}
    </div>
  )
}

/**
 * A lista de navegação em si — o único markup de link de menu do painel,
 * compartilhado pela barra lateral e pela gaveta. `somenteIcones` cobre a
 * barra recolhida; o rótulo continua acessível por `title` e por texto
 * exclusivo de leitor de tela, nunca simplesmente removido.
 */
function NavegacaoDoPainel({ somenteIcones }: { somenteIcones: boolean }) {
  return (
    <nav aria-label="Áreas do painel" className="flex-1 overflow-y-auto p-3">
      <ul className="flex flex-col gap-1">
        {LINKS_DE_NAVEGACAO.map(({ rota, rotulo, icone: Icone }) => (
          <li key={rota}>
            <NavLink
              to={rota}
              end={rota === '/'}
              title={somenteIcones ? rotulo : undefined}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                  somenteIcones ? 'justify-center' : '',
                  // Cor de marca só como acento do item ativo — o resto da
                  // navegação é neutro (ver docs/PAINEL.md).
                  isActive
                    ? 'bg-blue-institutional/10 text-blue-institutional'
                    : 'text-graytxt hover:bg-slate-100 hover:text-navy',
                ]
                  .filter((parte) => parte.length > 0)
                  .join(' ')
              }
            >
              <Icone aria-hidden="true" className="h-4 w-4 shrink-0" />
              {somenteIcones ? <span className="sr-only">{rotulo}</span> : rotulo}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
