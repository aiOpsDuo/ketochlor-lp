import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { ApiError, apiFetch } from '../../lib/api-client'
import { SECTION_LABELS } from './section-labels'
import type { SecaoResumo } from './section-summary'

const formatadorDeData = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

/**
 * Tela inicial do painel (`/admin`): lista as 11 seções do CMS na mesma
 * ordem devolvida por `GET /api/admin/sections` — a própria API já garante
 * essa ordem a partir de `CONTENT_SECTIONS` (ver comentário de decisão em
 * `ListarSecoesUseCase`), então esta tela não precisa conhecer nem repetir
 * a ordem por conta própria.
 */
export function SectionListPage() {
  const { session } = useAuth()
  const [secoes, setSecoes] = useState<SecaoResumo[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    // `ProtectedRoute` só renderiza esta árvore com sessão presente, mas o
    // tipo de `useAuth()` continua `Session | null` — guarda explícita em
    // vez de asserção não-nula, pelo mesmo motivo de precisão de tipo (G26).
    if (!session) {
      return
    }

    let cancelado = false

    apiFetch<SecaoResumo[]>('/api/admin/sections', session.access_token)
      .then((resultado) => {
        if (!cancelado) {
          setSecoes(resultado)
        }
      })
      .catch((erroRequisicao: unknown) => {
        if (cancelado) {
          return
        }
        const mensagem =
          erroRequisicao instanceof ApiError
            ? erroRequisicao.message
            : 'Não foi possível carregar as seções.'
        setErro(mensagem)
      })

    return () => {
      cancelado = true
    }
  }, [session])

  if (erro) {
    return (
      <p role="alert" className="text-sm text-red-600">
        {erro}
      </p>
    )
  }

  if (!secoes) {
    return <p className="text-sm text-gray-500">Carregando seções…</p>
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Seções da landing page</h1>
      <ul className="divide-y divide-gray-200 rounded border border-gray-200 bg-white">
        {secoes.map((secao) => (
          <li key={secao.key}>
            <Link
              to={`/sections/${secao.key}`}
              className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-gray-50"
            >
              <span className="font-medium text-gray-900">{SECTION_LABELS[secao.key]}</span>
              <span
                className={
                  secao.isPublished
                    ? 'rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800'
                    : 'rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-600'
                }
              >
                {secao.isPublished ? 'Publicada' : 'Não publicada'}
              </span>
              <span className="text-sm text-gray-500">
                Atualizado em {formatadorDeData.format(new Date(secao.updatedAt))}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
