import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/auth-context'
import { ApiError, apiFetch, apiFetchTexto } from '../../lib/api-client'
import type { LeadResumo } from './lead-summary'

const formatadorDeData = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

/**
 * `from`/`to` (`<input type="date">`) chegam como `"AAAA-MM-DD"`. A API
 * (`docs/API.md`) aceita qualquer data ISO 8601 válida para `from`/`to`
 * (`Date.parse`), mas interpreta os dois como limites de `created_at`
 * (`timestamptz`) — só a data, sem horário, faria `to` excluir os leads
 * criados depois da meia-noite UTC daquele dia. Por isso o limite inferior
 * vira início do dia e o superior, fim do dia, em UTC — o filtro cobre o
 * dia inteiro escolhido no seletor, dos dois lados.
 */
function construirQueryDePeriodo(from: string, to: string): string {
  const parametros = new URLSearchParams()
  if (from) {
    parametros.set('from', `${from}T00:00:00.000Z`)
  }
  if (to) {
    parametros.set('to', `${to}T23:59:59.999Z`)
  }
  const query = parametros.toString()
  return query ? `?${query}` : ''
}

function nomeDoArquivoCsv(from: string, to: string): string {
  if (!from && !to) {
    return 'leads.csv'
  }
  return `leads-${from || 'inicio'}-a-${to || 'hoje'}.csv`
}

/**
 * Dispara o download de `conteudoCsv` no navegador a partir de um `Blob` +
 * link programático (`URL.createObjectURL`) — decisão registrada em
 * `docs/PAINEL.md`: um link/âncora simples apontando direto para
 * `GET /api/admin/leads/export.csv` não funcionaria, porque essa rota exige
 * `Authorization: Bearer <jwt>` (confirmado em
 * `apps/api/src/presentation/leads/leads-admin.controller.ts` — sem suporte
 * a token via query param) e uma navegação de navegador para uma URL não
 * anexa cabeçalho customizado nenhum.
 */
function baixarCsv(conteudoCsv: string, nomeDoArquivo: string): void {
  const blob = new Blob([conteudoCsv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeDoArquivo
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

/**
 * Tela de consulta de leads (`/leads`, URL real `/admin/leads` — SDD §
 * Critérios de aceitação por capacidade, "Consulta e exportação de leads").
 * Lista `GET /api/admin/leads?from=&to=`, já devolvida mais recente primeiro
 * pela própria API (`LeadsRepository.listarPorPeriodo`, `ORDER BY created_at
 * DESC`) — esta tela não reordena no cliente.
 */
export function LeadsPage() {
  const { session } = useAuth()
  const [leads, setLeads] = useState<LeadResumo[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)

  const buscarLeads = useCallback(async () => {
    if (!session) {
      return
    }
    try {
      const resultado = await apiFetch<LeadResumo[]>(
        `/api/admin/leads${construirQueryDePeriodo(from, to)}`,
        session.access_token,
      )
      setLeads(resultado)
      setErro(null)
    } catch (erroRequisicao: unknown) {
      const mensagem =
        erroRequisicao instanceof ApiError
          ? erroRequisicao.message
          : 'Não foi possível carregar os leads.'
      setErro(mensagem)
    }
  }, [session, from, to])

  useEffect(() => {
    let cancelado = false
    buscarLeads().then(() => {
      if (cancelado) {
        return
      }
    })
    return () => {
      cancelado = true
    }
  }, [buscarLeads])

  async function handleExcluir(lead: LeadResumo) {
    if (!session) {
      return
    }
    const confirmado = window.confirm(
      `Excluir o lead de "${lead.nome}" (${lead.email})? Esta ação não pode ser desfeita.`,
    )
    if (!confirmado) {
      return
    }

    setExcluindoId(lead.id)
    try {
      await apiFetch<void>(`/api/admin/leads/${lead.id}`, session.access_token, {
        method: 'DELETE',
      })
      await buscarLeads()
    } catch (erroRequisicao: unknown) {
      const mensagem =
        erroRequisicao instanceof ApiError ? erroRequisicao.message : 'Não foi possível excluir o lead.'
      setErro(mensagem)
    } finally {
      setExcluindoId(null)
    }
  }

  async function handleExportarCsv() {
    if (!session) {
      return
    }
    setExportando(true)
    try {
      const conteudoCsv = await apiFetchTexto(
        `/api/admin/leads/export.csv${construirQueryDePeriodo(from, to)}`,
        session.access_token,
      )
      baixarCsv(conteudoCsv, nomeDoArquivoCsv(from, to))
      setErro(null)
    } catch (erroRequisicao: unknown) {
      const mensagem =
        erroRequisicao instanceof ApiError
          ? erroRequisicao.message
          : 'Não foi possível exportar os leads.'
      setErro(mensagem)
    } finally {
      setExportando(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-xl font-semibold text-gray-900">Leads</h1>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col text-sm text-gray-600">
            De
            <input
              type="date"
              value={from}
              onChange={(evento) => setFrom(evento.target.value)}
              className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-600">
            Até
            <input
              type="date"
              value={to}
              onChange={(evento) => setTo(evento.target.value)}
              className="rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
            />
          </label>
          <button
            type="button"
            onClick={handleExportarCsv}
            disabled={exportando || !leads || leads.length === 0}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {exportando ? 'Exportando…' : 'Exportar CSV'}
          </button>
        </div>
      </div>

      {erro && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {erro}
        </p>
      )}

      {!leads ? (
        <p className="text-sm text-gray-500">Carregando leads…</p>
      ) : leads.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhum lead encontrado para o período selecionado.</p>
      ) : (
        <div className="overflow-x-auto rounded border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Nome</th>
                <th className="px-4 py-2">E-mail</th>
                <th className="px-4 py-2">Telefone</th>
                <th className="px-4 py-2">CRMV</th>
                <th className="px-4 py-2">Cidade/UF</th>
                <th className="px-4 py-2">Especialidade</th>
                <th className="px-4 py-2">Cliente Virbac</th>
                <th className="px-4 py-2">Contato comercial</th>
                <th className="px-4 py-2">Origem</th>
                <th className="px-4 py-2">Recebido em</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leads.map((lead) => (
                <tr key={lead.id}>
                  <td className="px-4 py-2 font-medium text-gray-900">{lead.nome}</td>
                  <td className="px-4 py-2 text-gray-700">{lead.email}</td>
                  <td className="px-4 py-2 text-gray-700">{lead.telefone ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-700">{lead.crmv ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-700">{lead.estadoCidade ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-700">{lead.especialidade ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-700">{lead.jaClienteVirbac ? 'Sim' : 'Não'}</td>
                  <td className="px-4 py-2 text-gray-700">
                    {lead.desejaContatoComercial ? 'Sim' : 'Não'}
                  </td>
                  <td className="px-4 py-2 text-gray-700">{lead.origem ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-700">
                    {formatadorDeData.format(new Date(lead.createdAt))}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => handleExcluir(lead)}
                      disabled={excluindoId === lead.id}
                      className="rounded border border-red-300 px-2 py-1 text-xs text-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {excluindoId === lead.id ? 'Excluindo…' : 'Excluir'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
