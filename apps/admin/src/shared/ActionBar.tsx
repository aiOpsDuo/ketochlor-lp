import type { ReactNode } from 'react'

interface ActionBarProps {
  children: ReactNode
}

/**
 * Barra de ação fixa no rodapé da viewport, para o botão de salvar de um
 * formulário longo (edição de seção, metadados): num formulário gerado a
 * partir do schema, o botão no fim do fluxo do documento pode ficar a várias
 * telas de rolagem do campo que se acabou de editar.
 *
 * O leve blur de fundo (`backdrop-blur`) mantém legível o conteúdo que passa
 * por baixo da barra sem escondê-lo. Quem usa a barra deve reservar o espaço
 * dela no fim do conteúdo (`pb-*`), para o último campo nunca ficar coberto.
 */
export function ActionBar({ children }: ActionBarProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-cardborder bg-white/85 backdrop-blur dark:border-slate-800 dark:bg-slate-900/85">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-end gap-3 px-4 py-3 sm:px-6">
        {children}
      </div>
    </div>
  )
}
