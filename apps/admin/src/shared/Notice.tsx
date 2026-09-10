import { CircleAlert, CircleCheck } from 'lucide-react'
import type { ReactNode } from 'react'

type TipoDeAviso = 'sucesso' | 'erro'

interface NoticeProps {
  tipo: TipoDeAviso
  children: ReactNode
  className?: string
}

/**
 * Aviso inline de sucesso (verde) ou erro (vermelho) — o mesmo par de estados
 * que toda tela do painel já expressava com um `<p role="alert">` ou
 * `<p role="status">` solto, agora com ícone e contraste consistentes.
 *
 * O papel ARIA acompanha o tipo, mantendo o comportamento de leitor de tela
 * que as telas já tinham: `alert` (interrompe, para erro) e `status` (educado,
 * para confirmação de sucesso).
 */
export function Notice({ tipo, children, className = '' }: NoticeProps) {
  const ehErro = tipo === 'erro'
  const Icone = ehErro ? CircleAlert : CircleCheck
  const cores = ehErro
    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300'
    : 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300'

  return (
    <div
      role={ehErro ? 'alert' : 'status'}
      className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-sm ${cores} ${className}`}
    >
      <Icone aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  )
}
