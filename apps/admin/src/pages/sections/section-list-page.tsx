import { ChevronRight } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { ApiError, apiFetch } from '../../lib/api-client'
import { Card } from '../../shared/Card'
import { Notice } from '../../shared/Notice'
import { classeDeEtiqueta } from '../../shared/classes'
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
    return <Notice tipo="erro">{erro}</Notice>
  }

  if (!secoes) {
    return <p className="text-sm text-graytxt">Carregando seções…</p>
  }

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold text-navy">Seções da landing page</h1>
        <p className="mt-1 text-sm text-graytxt">
          Escolha uma seção para editar o conteúdo publicado na página.
        </p>
      </header>

      {/* `!p-0`: a lista já tem o próprio espaçamento por linha — ver `Card`. */}
      <Card className="!p-0">
        <ul className="divide-y divide-cardborder">
          {secoes.map((secao) => (
            <li key={secao.key}>
              <Link
                to={`/sections/${secao.key}`}
                className="group flex items-center gap-4 px-4 py-3.5 transition first:rounded-t-xl last:rounded-b-xl hover:bg-lighttint"
              >
                <span className="min-w-0 flex-1 truncate font-medium text-navy group-hover:text-blue-institutional">
                  {SECTION_LABELS[secao.key]}
                </span>
                <span className={classeDeEtiqueta(secao.isPublished)}>
                  {secao.isPublished ? 'Publicada' : 'Não publicada'}
                </span>
                <span className="hidden text-xs text-graytxt sm:inline">
                  Atualizado em {formatadorDeData.format(new Date(secao.updatedAt))}
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-institutional"
                />
              </Link>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
