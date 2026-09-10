import type { ReactNode } from 'react'

interface ActionBarProps {
  /** Conteúdo alinhado à esquerda (ex. link de "voltar") — opcional, nem toda tela tem um. */
  start?: ReactNode
  /** Conteúdo alinhado à direita (mensagens de estado + botão de ação) — sempre presente. */
  end: ReactNode
}

/**
 * Barra de ação fixa no rodapé da viewport, para o botão de salvar de um
 * formulário longo (edição de seção, metadados): num formulário gerado a
 * partir do schema, o botão no fim do fluxo do documento pode ficar a várias
 * telas de rolagem do campo que se acabou de editar.
 *
 * `start`/`end` (correção da tarefa
 * `ajustes/corrige-layout-formularios-menu-e-nomenclaturas`, achado de QA
 * visual comparado ao painel de referência): antes um único `children`
 * alinhado à direita, sem espaço para uma ação secundária à esquerda (ex. o
 * link "Voltar para a lista de seções" de `SectionDetailPage`, que antes
 * ficava solto acima do título). Quem não tem `start` (ex. `MetadataPage`)
 * simplesmente não passa a prop.
 *
 * `lg:left-[var(--admin-sidebar-largura)]` (achado de QA visual da mesma
 * correção, revisão desta verificação): por ser `fixed`, esta barra ocupa a
 * largura da VIEWPORT inteira — `inset-x-0` sozinho a faz começar em x=0,
 * por BAIXO da barra lateral fixa do painel (`AdminLayout`). Enquanto só
 * existia conteúdo `end` (alinhado à direita, longe da barra lateral), isso
 * nunca aparecia; com `start` a partir de agora renderizando à esquerda, ele
 * ficava parcialmente escondido atrás da barra lateral em telas largas.
 * `--admin-sidebar-largura` é a mesma largura que `AdminLayout` já usa para
 * recuar o conteúdo principal (`recuoDoConteudo`), exposta como variável CSS
 * no ancestral comum — herda por cascata até aqui mesmo com `position:
 * fixed`, que não afeta herança de variável CSS, só posicionamento.
 *
 * O leve blur de fundo (`backdrop-blur`) mantém legível o conteúdo que passa
 * por baixo da barra sem escondê-lo. Quem usa a barra deve reservar o espaço
 * dela no fim do conteúdo (`pb-*`), para o último campo nunca ficar coberto.
 */
export function ActionBar({ start, end }: ActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cardborder bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85 lg:left-[var(--admin-sidebar-largura)]">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">{start}</div>
        <div className="flex flex-wrap items-center gap-3">{end}</div>
      </div>
    </div>
  )
}
