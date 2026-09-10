import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  /**
   * Classes extras. Use `!p-0` quando o cartão envolve uma lista ou tabela que
   * já tem o próprio espaçamento por linha/célula — sem isso o padding do
   * cartão soma ao da linha e a borda deixa de encostar na primeira/última
   * linha (padrão usado por `SectionListPage` e `LeadsPage`).
   */
  className?: string
}

/**
 * Bloco branco de conteúdo do painel: borda sutil na cor de marca
 * (`cardborder`, a mesma dos cartões da LP) e padding interno consistente.
 *
 * É o único lugar que decide como um cartão do painel se parece — nenhuma tela
 * repete `rounded-xl border border-cardborder bg-white ...` por conta própria.
 */
export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`rounded-xl border border-cardborder bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  )
}
