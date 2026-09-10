import {
  LayoutList,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
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
import { useTheme } from '../theme/theme-context'

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
  const { theme, toggleTheme } = useTheme()
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
    <div className="min-h-screen bg-lighttint dark:bg-slate-950">
      {/* Barra lateral — desktop */}
      <aside
        className={`hidden border-r border-cardborder bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-900 ${larguraDaLateral}`}
      >
        <MarcaDoPainel recolhida={recolhida} />
        <NavegacaoDoPainel somenteIcones={recolhida} />
        <div className="border-t border-cardborder p-3 dark:border-slate-800">
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
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-cardborder bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex h-16 items-center justify-between gap-2 border-b border-cardborder pl-4 pr-2 dark:border-slate-800">
              {/* Mesmo logo real da barra lateral de desktop (`LogoDoPainel`,
                  reaproveitado de `MarcaDoPainel` abaixo) — critério de
                  "pronto" da tarefa exige o logo TANTO na barra quanto na
                  gaveta, não só um texto com o nome do painel. */}
              <LogoDoPainel recolhida={false} />
              <button
                type="button"
                onClick={() => setGavetaAberta(false)}
                aria-label="Fechar menu"
                className="rounded-lg p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
            <NavegacaoDoPainel somenteIcones={false} />
          </div>
        </div>
      )}

      <div className={recuoDoConteudo}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-cardborder bg-white/85 px-4 backdrop-blur sm:px-6 dark:border-slate-800 dark:bg-slate-900/85">
          <button
            type="button"
            onClick={() => setGavetaAberta(true)}
            aria-label="Abrir menu"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <Menu aria-hidden="true" className="h-5 w-5" />
          </button>
          <span className="font-semibold text-navy dark:text-slate-100">Painel Ketochlor</span>
          <div className="ml-auto flex items-center gap-3">
            {session?.user.email && (
              <span className="hidden text-sm text-graytxt sm:inline dark:text-slate-400">
                {session.user.email}
              </span>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
              className={classeDeBotao('secundario', 'pequeno')}
            >
              {theme === 'dark' ? (
                <Sun aria-hidden="true" className="h-4 w-4" />
              ) : (
                <Moon aria-hidden="true" className="h-4 w-4" />
              )}
            </button>
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

/**
 * Logo real do Ketochlor (correção da tarefa
 * `ajustes/tema-escuro-logo-e-campo-de-imagem`; a tarefa anterior
 * `ajustes/estiliza-painel-admin` optou deliberadamente por um selo com a
 * letra "K" "no lugar de um logo que o painel não precisa" — decisão
 * revertida a pedido do usuário).
 *
 * **Duplicação de arquivo deliberada e aceita, não um descuido:** o arquivo é
 * o MESMO PNG que `apps/lp/src/components/Header.tsx`/`Footer.tsx` já servem
 * (`apps/lp/public/assets/logo-ketochlor-transp.png`), copiado para
 * `apps/admin/public/assets/` porque `apps/admin` é um app Vite próprio e não
 * pode importar de dentro de `apps/lp`, e este logo é um arquivo estático
 * local — não uma URL pública de Storage compartilhável entre os dois apps
 * sem mexer em `apps/lp` (fora do escopo desta tarefa). Se o arquivo de
 * origem mudar, esta cópia precisa ser atualizada junto.
 */
function MarcaDoPainel({ recolhida }: { recolhida: boolean }) {
  return (
    <div className="flex h-16 items-center border-b border-cardborder px-4 dark:border-slate-800">
      <LogoDoPainel recolhida={recolhida} />
    </div>
  )
}

/**
 * Só o logo + nome, sem a borda/altura fixa de `MarcaDoPainel` — extraído
 * porque a gaveta mobile precisa do MESMO logo ao lado do próprio botão de
 * fechar, na mesma linha, e não pode reusar `MarcaDoPainel` inteiro sem
 * herdar uma segunda borda/padding que não fazem sentido ali (mesmo
 * raciocínio de `NavegacaoDoPainel`: nenhum markup de logo duplicado entre
 * os dois lugares que o mostram).
 */
function LogoDoPainel({ recolhida }: { recolhida: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <img
        src="/assets/logo-ketochlor-transp.png"
        alt="Ketochlor"
        className="h-8 w-auto shrink-0"
      />
      {!recolhida && <span className="truncate font-semibold text-navy dark:text-slate-100">Ketochlor</span>}
    </span>
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
                  // navegação é neutro (ver docs/PAINEL.md). No escuro,
                  // `blue-institutional` (#26468A) perde contraste sobre um
                  // fundo já escuro, então o acento troca para um azul mais
                  // claro (`blue-300`) só nessa variante — a cor de marca em
                  // si continua reservada ao modo claro.
                  isActive
                    ? 'bg-blue-institutional/10 text-blue-institutional dark:bg-blue-400/10 dark:text-blue-300'
                    : 'text-graytxt hover:bg-slate-100 hover:text-navy dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100',
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
