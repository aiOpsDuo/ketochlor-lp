import { Trash2, UserPlus } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/auth-context'
import { ApiError, apiFetch } from '../../lib/api-client'
import { Card } from '../../shared/Card'
import { Notice } from '../../shared/Notice'
import { atributosDeCampo, FormField } from '../../shared/FormField'
import { classeDeBotao, classeDeCampo } from '../../shared/classes'
import type { OperatorResumo } from './operator-summary'

const formatadorDeData = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

/** Mensagem de erro de um campo específico do formulário de criação, ou `undefined` se não houver. */
function erroDoCampo(erros: { campo: string; mensagem: string }[] | null, campo: string): string | undefined {
  return erros?.find((erro) => erro.campo === campo)?.mensagem
}

/**
 * Tela de gestão de operadores (`/operators`, URL real `/admin/operators` —
 * PLAN.md, tarefa `ajustes/modulo-operadores`): quem pode logar no painel.
 * **Sem tabela própria no banco** — cada "operador" é, integralmente, um
 * usuário do Supabase Auth (`GET`/`POST /api/admin/operators`, `DELETE
 * /api/admin/operators/:id`, `docs/API.md`).
 *
 * Mesmo padrão de tela autenticada de `LeadsPage`: `apiFetch` com
 * `session.access_token`, estado de carregamento/erro explícito, exclusão
 * com confirmação em dois passos na própria linha da tabela.
 *
 * **As duas recusas de remoção são antecipadas aqui** (botão desabilitado com
 * o motivo visível, sem exigir uma tentativa que a API recusaria com `409`):
 * a própria conta logada (`operator.id === session.user.id`) e o único
 * operador restante (`operators.length === 1` — quando só resta 1 operador,
 * ele é necessariamente a própria conta logada, então esta checagem tem
 * prioridade de exibição sobre a de "própria conta", por ser a informação
 * mais específica das duas).
 */
export function OperatorsPage() {
  const { session } = useAuth()
  const [operators, setOperators] = useState<OperatorResumo[] | null>(null)
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null)

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [criando, setCriando] = useState(false)
  const [errosCriacao, setErrosCriacao] = useState<{ campo: string; mensagem: string }[] | null>(null)
  const [mensagemErroCriacao, setMensagemErroCriacao] = useState<string | null>(null)
  const [sucessoCriacao, setSucessoCriacao] = useState<string | null>(null)

  const [excluindoId, setExcluindoId] = useState<string | null>(null)
  const [erroExclusao, setErroExclusao] = useState<string | null>(null)
  /** Operador cuja exclusão está aguardando o segundo clique de confirmação — mesmo padrão de `LeadsPage`. */
  const [confirmandoExclusaoId, setConfirmandoExclusaoId] = useState<string | null>(null)

  const buscarOperators = useCallback(async () => {
    if (!session) {
      return
    }
    try {
      const resultado = await apiFetch<OperatorResumo[]>('/api/admin/operators', session.access_token)
      setOperators(resultado)
      setErroCarregamento(null)
    } catch (erroRequisicao: unknown) {
      const mensagem =
        erroRequisicao instanceof ApiError
          ? erroRequisicao.message
          : 'Não foi possível carregar os operadores.'
      setErroCarregamento(mensagem)
    }
  }, [session])

  useEffect(() => {
    buscarOperators()
  }, [buscarOperators])

  async function handleCriar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!session) {
      return
    }

    setCriando(true)
    setErrosCriacao(null)
    setMensagemErroCriacao(null)
    setSucessoCriacao(null)

    try {
      const operadorCriado = await apiFetch<OperatorResumo>('/api/admin/operators', session.access_token, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, email, senha }),
      })
      setSucessoCriacao(`Operador "${operadorCriado.nome}" criado com sucesso.`)
      setNome('')
      setEmail('')
      setSenha('')
      await buscarOperators()
    } catch (erroRequisicao: unknown) {
      if (erroRequisicao instanceof ApiError) {
        setMensagemErroCriacao(erroRequisicao.message)
        setErrosCriacao(erroRequisicao.erros)
      } else {
        setMensagemErroCriacao('Não foi possível criar o operador.')
      }
    } finally {
      setCriando(false)
    }
  }

  async function handleExcluir(operator: OperatorResumo) {
    if (!session) {
      return
    }

    setExcluindoId(operator.id)
    setErroExclusao(null)
    try {
      await apiFetch<void>(`/api/admin/operators/${operator.id}`, session.access_token, {
        method: 'DELETE',
      })
      await buscarOperators()
    } catch (erroRequisicao: unknown) {
      const mensagem =
        erroRequisicao instanceof ApiError ? erroRequisicao.message : 'Não foi possível remover o operador.'
      setErroExclusao(mensagem)
    } finally {
      setExcluindoId(null)
      setConfirmandoExclusaoId(null)
    }
  }

  /** Motivo de o botão de remoção estar desabilitado para este operador, ou `null` se a remoção for permitida. */
  function motivoRemocaoDesabilitada(operator: OperatorResumo): string | null {
    if (operators && operators.length === 1) {
      return 'Único operador restante'
    }
    if (session && operator.id === session.user.id) {
      return 'Sua própria conta'
    }
    return null
  }

  const formularioIncompleto = nome.trim().length === 0 || email.trim().length === 0 || senha.length === 0

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-2xl font-semibold text-navy dark:text-slate-100">Operadores</h1>
        <p className="mt-1 text-sm text-graytxt dark:text-slate-400">
          Quem pode entrar no painel administrativo, do mais recente para o mais antigo.
        </p>
      </header>

      <Card>
        <form onSubmit={handleCriar} className="flex flex-col gap-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField id="operator-nome" label="Nome" erro={erroDoCampo(errosCriacao, 'nome')}>
              <input
                {...atributosDeCampo('operator-nome', { erro: erroDoCampo(errosCriacao, 'nome') })}
                type="text"
                autoComplete="name"
                value={nome}
                onChange={(evento) => setNome(evento.target.value)}
                className={classeDeCampo(Boolean(erroDoCampo(errosCriacao, 'nome')))}
              />
            </FormField>

            <FormField id="operator-email" label="E-mail" erro={erroDoCampo(errosCriacao, 'email')}>
              <input
                {...atributosDeCampo('operator-email', { erro: erroDoCampo(errosCriacao, 'email') })}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(evento) => setEmail(evento.target.value)}
                className={classeDeCampo(Boolean(erroDoCampo(errosCriacao, 'email')))}
              />
            </FormField>

            <FormField
              id="operator-senha"
              label="Senha inicial"
              erro={erroDoCampo(errosCriacao, 'senha')}
              ajuda={!erroDoCampo(errosCriacao, 'senha') ? 'Mínimo de 6 caracteres.' : undefined}
            >
              <input
                {...atributosDeCampo('operator-senha', {
                  temAjuda: !erroDoCampo(errosCriacao, 'senha'),
                  erro: erroDoCampo(errosCriacao, 'senha'),
                })}
                type="password"
                autoComplete="new-password"
                value={senha}
                onChange={(evento) => setSenha(evento.target.value)}
                className={classeDeCampo(Boolean(erroDoCampo(errosCriacao, 'senha')))}
              />
            </FormField>
          </div>

          {mensagemErroCriacao && <Notice tipo="erro">{mensagemErroCriacao}</Notice>}
          {sucessoCriacao && <Notice tipo="sucesso">{sucessoCriacao}</Notice>}

          <button
            type="submit"
            disabled={criando || formularioIncompleto}
            className={classeDeBotao('primario', 'medio', 'self-start')}
          >
            <UserPlus aria-hidden="true" className="h-4 w-4" />
            {criando ? 'Criando…' : 'Criar operador'}
          </button>
        </form>
      </Card>

      {erroCarregamento && <Notice tipo="erro">{erroCarregamento}</Notice>}
      {erroExclusao && <Notice tipo="erro">{erroExclusao}</Notice>}

      {!operators ? (
        <p className="text-sm text-graytxt dark:text-slate-400">Carregando operadores…</p>
      ) : operators.length === 0 ? (
        <Card>
          <p className="text-sm text-graytxt dark:text-slate-400">Nenhum operador encontrado.</p>
        </Card>
      ) : (
        // `!p-0`: a tabela já tem espaçamento por célula — ver `Card`.
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-graytxt dark:bg-slate-800 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-2.5">Nome</th>
                  <th className="px-4 py-2.5">E-mail</th>
                  <th className="px-4 py-2.5">Criado em</th>
                  <th className="px-4 py-2.5">Último login</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-cardborder dark:divide-slate-800">
                {operators.map((operator) => {
                  const motivoDesabilitada = motivoRemocaoDesabilitada(operator)
                  return (
                    <tr
                      key={operator.id}
                      className="align-top transition hover:bg-lighttint dark:hover:bg-slate-800/60"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5 font-medium text-navy dark:text-slate-100">
                        {operator.nome}
                      </td>
                      <td className="px-4 py-2.5 text-graytxt dark:text-slate-400">{operator.email}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-graytxt dark:text-slate-400">
                        {formatadorDeData.format(new Date(operator.criadoEm))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-graytxt dark:text-slate-400">
                        {operator.ultimoLoginEm
                          ? formatadorDeData.format(new Date(operator.ultimoLoginEm))
                          : 'Nunca acessou'}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {motivoDesabilitada ? (
                          <span className="text-xs text-graytxt dark:text-slate-400">
                            {motivoDesabilitada}
                          </span>
                        ) : confirmandoExclusaoId === operator.id ? (
                          <span className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleExcluir(operator)}
                              disabled={excluindoId === operator.id}
                              aria-label={`Confirmar a remoção do operador ${operator.nome} (${operator.email})`}
                              className={classeDeBotao('perigo', 'pequeno')}
                            >
                              {excluindoId === operator.id ? 'Removendo…' : 'Confirmar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmandoExclusaoId(null)}
                              disabled={excluindoId === operator.id}
                              aria-label={`Cancelar a remoção do operador ${operator.nome}`}
                              className={classeDeBotao('secundario', 'pequeno')}
                            >
                              Cancelar
                            </button>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmandoExclusaoId(operator.id)}
                            aria-label={`Remover o operador ${operator.nome} (${operator.email})`}
                            className={classeDeBotao('perigo', 'pequeno')}
                          >
                            <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                            Remover
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
