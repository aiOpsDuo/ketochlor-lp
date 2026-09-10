import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/auth-context'
import { ApiError, apiFetch } from '../../lib/api-client'
import { ActionBar } from '../../shared/ActionBar'
import { Card } from '../../shared/Card'
import { Notice } from '../../shared/Notice'
import { atributosDeCampo, FormField } from '../../shared/FormField'
import { classeDeBotao, classeDeCampo } from '../../shared/classes'
import type { SiteMetadata } from './site-metadata'

/** Corpo de formulário controlado — sempre texto, mesmo para `ogImageMediaId` (ver comentário abaixo). */
interface FormularioMetadata {
  title: string
  description: string
  ogImageMediaId: string
}

function paraFormulario(metadata: SiteMetadata): FormularioMetadata {
  return {
    title: metadata.title,
    description: metadata.description,
    ogImageMediaId: metadata.ogImageMediaId ?? '',
  }
}

/**
 * Tela de edição dos metadados de busca/compartilhamento (`/metadata`, SDD §
 * Critérios de aceitação por capacidade — "Metadados de busca e
 * compartilhamento"): busca o estado atual via `GET /api/admin/metadata` ao
 * montar e salva via `PUT /api/admin/metadata` (`docs/API.md`), mesmo padrão
 * de tela autenticada de `SectionListPage` (`apiFetch` com
 * `session.access_token`, estado de carregamento/erro explícito).
 *
 * **Simplificação declarada desta tarefa (`painel/tela-metadados`):**
 * `ogImageMediaId` é um campo de texto livre para colar o id de um
 * `media_assets` já existente — não há upload de imagem real aqui. O upload
 * de fato (`POST /api/admin/media/upload-url` + envio ao Storage) é da
 * tarefa `painel/formulario-edicao-secao`, fora do escopo desta tela; quando
 * essa tarefa existir, o mesmo padrão de seletor de imagem pode substituir
 * este campo de texto sem mudar o contrato com a API (`ogImageMediaId`
 * continua sendo só um id de string ou `null`).
 */
export function MetadataPage() {
  const { session } = useAuth()
  const [formulario, setFormulario] = useState<FormularioMetadata | null>(null)
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)
  const [salvoComSucesso, setSalvoComSucesso] = useState(false)

  useEffect(() => {
    // `ProtectedRoute` só renderiza esta árvore com sessão presente, mesma
    // guarda explícita de `SectionListPage` (tipo de `useAuth()` continua
    // `Session | null`, G26).
    if (!session) {
      return
    }

    let cancelado = false

    apiFetch<SiteMetadata>('/api/admin/metadata', session.access_token)
      .then((resultado) => {
        if (!cancelado) {
          setFormulario(paraFormulario(resultado))
        }
      })
      .catch((erroRequisicao: unknown) => {
        if (cancelado) {
          return
        }
        const mensagem =
          erroRequisicao instanceof ApiError
            ? erroRequisicao.message
            : 'Não foi possível carregar os metadados.'
        setErroCarregamento(mensagem)
      })

    return () => {
      cancelado = true
    }
  }, [session])

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!session || !formulario) {
      return
    }

    setSalvando(true)
    setErroSalvar(null)
    setSalvoComSucesso(false)

    try {
      const ogImageMediaId = formulario.ogImageMediaId.trim()
      const atualizado = await apiFetch<SiteMetadata>('/api/admin/metadata', session.access_token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formulario.title,
          description: formulario.description,
          ogImageMediaId: ogImageMediaId.length > 0 ? ogImageMediaId : null,
        }),
      })
      setFormulario(paraFormulario(atualizado))
      setSalvoComSucesso(true)
    } catch (erroRequisicao) {
      // Mostra o erro de validação real devolvido pela API (`erros`, um por
      // campo — `docs/API.md`), não uma mensagem genérica de "erro ao
      // salvar": é o que permite ao operador saber exatamente qual campo
      // corrigir (ex. "O campo "title" é obrigatório.").
      if (erroRequisicao instanceof ApiError) {
        const mensagem =
          erroRequisicao.erros && erroRequisicao.erros.length > 0
            ? erroRequisicao.erros.map((erro) => erro.mensagem).join(' ')
            : erroRequisicao.message
        setErroSalvar(mensagem)
      } else {
        setErroSalvar('Não foi possível salvar os metadados.')
      }
    } finally {
      setSalvando(false)
    }
  }

  if (erroCarregamento) {
    return <Notice tipo="erro">{erroCarregamento}</Notice>
  }

  if (!formulario) {
    return <p className="text-sm text-graytxt">Carregando metadados…</p>
  }

  return (
    // `pb-24` reserva a altura da `ActionBar` fixa no rodapé.
    <div className="flex flex-col gap-5 pb-24">
      <header>
        <h1 className="text-2xl font-semibold text-navy">Metadados da página</h1>
        <p className="mt-1 text-sm text-graytxt">
          Título, descrição e imagem usados por buscadores e por prévias de link em redes sociais.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <Card>
          <div className="flex flex-col gap-4">
            <FormField id="metadata-title" label="Título">
              <input
                {...atributosDeCampo('metadata-title')}
                type="text"
                required
                value={formulario.title}
                onChange={(evento) => setFormulario({ ...formulario, title: evento.target.value })}
                className={classeDeCampo(false)}
              />
            </FormField>

            <FormField id="metadata-description" label="Descrição">
              <textarea
                {...atributosDeCampo('metadata-description')}
                required
                rows={4}
                value={formulario.description}
                onChange={(evento) =>
                  setFormulario({ ...formulario, description: evento.target.value })
                }
                className={classeDeCampo(false)}
              />
            </FormField>

            <FormField
              id="metadata-og-image"
              label="Id da imagem de compartilhamento (opcional)"
              ajuda="Upload de imagem real ainda não existe nesta tela — cole aqui o id de uma mídia já cadastrada."
            >
              <input
                {...atributosDeCampo('metadata-og-image', { temAjuda: true })}
                type="text"
                placeholder="id de media_assets — deixe em branco para remover"
                value={formulario.ogImageMediaId}
                onChange={(evento) =>
                  setFormulario({ ...formulario, ogImageMediaId: evento.target.value })
                }
                className={classeDeCampo(false)}
              />
            </FormField>
          </div>
        </Card>

        <ActionBar>
          {erroSalvar && (
            <Notice tipo="erro" className="mr-auto">
              {erroSalvar}
            </Notice>
          )}
          {salvoComSucesso && (
            <Notice tipo="sucesso" className="mr-auto">
              Metadados salvos com sucesso.
            </Notice>
          )}
          <button type="submit" disabled={salvando} className={classeDeBotao('primario')}>
            {salvando ? 'Salvando…' : 'Salvar'}
          </button>
        </ActionBar>
      </form>
    </div>
  )
}
