import { Download, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../auth/auth-context'
import { ApiError, apiFetch, apiFetchTexto } from '../../lib/api-client'
import { Card } from '../../shared/Card'
import { Notice } from '../../shared/Notice'
import { atributosDeCampo } from '../../shared/FormField'
import { CLASSE_ROTULO, classeDeBotao, classeDeCampo } from '../../shared/classes'
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
 *
 * A exclusão de um lead (ação irreversível) exige dois cliques deliberados na
 * própria célula da linha — "Excluir" e depois "Confirmar" — em vez de um
 * `window.confirm`: o diálogo nativo tira o foco da tabela e não mostra em
 * qual linha a ação vai cair, exatamente a informação de que quem confirma
 * precisa. A chamada de API resultante é a mesma (`DELETE
 * /api/admin/leads/:id`).
 */
export function LeadsPage() {
  const { session } = useAuth()
  const [leads, setLeads] = useState<LeadResumo[] | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [exportando, setExportando] = useState(false)
  /**
   * Lead cuja exclusão está aguardando o segundo clique de confirmação — a
   * confirmação acontece na própria célula da tabela, em dois passos, em vez
   * de um diálogo do navegador que interrompe a página inteira.
   */
  const [confirmandoExclusaoId, setConfirmandoExclusaoId] = useState<string | null>(null)

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
    // A lista está sendo recarregada (troca de período): uma confirmação de
    // exclusão pendente aponta para uma linha que pode nem existir no
    // resultado novo, então ela é descartada junto.
    setConfirmandoExclusaoId(null)
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
      setConfirmandoExclusaoId(null)
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
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold text-navy">Leads</h1>
        <p className="mt-1 text-sm text-graytxt">
          Cadastros recebidos pelo formulário da página, do mais recente para o mais antigo.
        </p>
      </header>

      <Card>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="leads-de" className={CLASSE_ROTULO}>
              De
            </label>
            <input
              {...atributosDeCampo('leads-de')}
              type="date"
              value={from}
              onChange={(evento) => setFrom(evento.target.value)}
              className={classeDeCampo(false, 'w-auto')}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="leads-ate" className={CLASSE_ROTULO}>
              Até
            </label>
            <input
              {...atributosDeCampo('leads-ate')}
              type="date"
              value={to}
              onChange={(evento) => setTo(evento.target.value)}
              className={classeDeCampo(false, 'w-auto')}
            />
          </div>
          <button
            type="button"
            onClick={handleExportarCsv}
            disabled={exportando || !leads || leads.length === 0}
            className={classeDeBotao('secundario', 'medio', 'ml-auto')}
          >
            <Download aria-hidden="true" className="h-4 w-4" />
            {exportando ? 'Exportando…' : 'Exportar CSV'}
          </button>
        </div>
      </Card>

      {erro && <Notice tipo="erro">{erro}</Notice>}

      {!leads ? (
        <p className="text-sm text-graytxt">Carregando leads…</p>
      ) : leads.length === 0 ? (
        <Card>
          <p className="text-sm text-graytxt">
            Nenhum lead encontrado para o período selecionado.
          </p>
        </Card>
      ) : (
        // `!p-0`: a tabela já tem espaçamento por célula — ver `Card`.
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-graytxt">
                <tr>
                  <th className="px-4 py-2.5">Nome</th>
                  <th className="px-4 py-2.5">E-mail</th>
                  <th className="px-4 py-2.5">Telefone</th>
                  <th className="px-4 py-2.5">CRMV</th>
                  <th className="px-4 py-2.5">Cidade/UF</th>
                  <th className="px-4 py-2.5">Especialidade</th>
                  <th className="px-4 py-2.5">Cliente Virbac</th>
                  <th className="px-4 py-2.5">Contato comercial</th>
                  <th className="px-4 py-2.5">Origem</th>
                  <th className="px-4 py-2.5">Recebido em</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              {/* `divide-y` no corpo em vez de borda por célula: uma linha só
                  precisa de um separador horizontal, e a grade completa
                  competiria com o próprio dado. */}
              <tbody className="divide-y divide-cardborder">
                {leads.map((lead) => (
                  <tr key={lead.id} className="align-top transition hover:bg-lighttint">
                    <td className="whitespace-nowrap px-4 py-2.5 font-medium text-navy">
                      {lead.nome}
                    </td>
                    <td className="px-4 py-2.5 text-graytxt">{lead.email}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-graytxt">
                      {lead.telefone ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-graytxt">{lead.crmv ?? '—'}</td>
                    <td className="px-4 py-2.5 text-graytxt">{lead.estadoCidade ?? '—'}</td>
                    <td className="px-4 py-2.5 text-graytxt">{lead.especialidade ?? '—'}</td>
                    <td className="px-4 py-2.5 text-graytxt">
                      {lead.jaClienteVirbac ? 'Sim' : 'Não'}
                    </td>
                    <td className="px-4 py-2.5 text-graytxt">
                      {lead.desejaContatoComercial ? 'Sim' : 'Não'}
                    </td>
                    <td className="px-4 py-2.5 text-graytxt">{lead.origem ?? '—'}</td>
                    <td className="whitespace-nowrap px-4 py-2.5 text-graytxt">
                      {formatadorDeData.format(new Date(lead.createdAt))}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {confirmandoExclusaoId === lead.id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleExcluir(lead)}
                            disabled={excluindoId === lead.id}
                            aria-label={`Confirmar a exclusão do lead de ${lead.nome} (${lead.email})`}
                            className={classeDeBotao('perigo', 'pequeno')}
                          >
                            {excluindoId === lead.id ? 'Excluindo…' : 'Confirmar'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmandoExclusaoId(null)}
                            disabled={excluindoId === lead.id}
                            aria-label={`Cancelar a exclusão do lead de ${lead.nome}`}
                            className={classeDeBotao('secundario', 'pequeno')}
                          >
                            Cancelar
                          </button>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmandoExclusaoId(lead.id)}
                          aria-label={`Excluir o lead de ${lead.nome} (${lead.email})`}
                          className={classeDeBotao('perigo', 'pequeno')}
                        >
                          <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                          Excluir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
