import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../auth/auth-context'
import { ApiError, apiFetch } from '../../lib/api-client'
import { enviarImagemParaStorage } from '../../lib/media-upload'
import { ActionBar } from '../../shared/ActionBar'
import { Card } from '../../shared/Card'
import { Dropzone } from '../../shared/Dropzone'
import { Notice } from '../../shared/Notice'
import { atributosDeCampo, FormField } from '../../shared/FormField'
import { classeDeBotao, classeDeCampo } from '../../shared/classes'
import type { SiteMetadata } from './site-metadata'

/** Corpo de formulário controlado — `ogImageUrl` já nasce `string | null`, sem sentinela de texto vazio (ver comentário abaixo). */
interface FormularioMetadata {
  title: string
  description: string
  ogImageUrl: string | null
}

function paraFormulario(metadata: SiteMetadata): FormularioMetadata {
  return {
    title: metadata.title,
    description: metadata.description,
    ogImageUrl: metadata.ogImageUrl,
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
 * **Correção da tarefa `ajustes/corrige-imagem-metadados` (achado de QA):**
 * `ogImageMediaId` (id de `media_assets` que nenhuma rota da API jamais
 * preenchia de verdade — ver `agent_context/CHANGELOG.md`) foi substituído
 * por `ogImageUrl`, e o campo de texto livre virou upload real de imagem com
 * preview, reaproveitando `enviarImagemParaStorage`
 * (`apps/admin/src/lib/media-upload.ts`) — a mesma função já usada pelos
 * campos de imagem de seção (`ImageFieldEditor`). Diferente daquele
 * componente, aqui NÃO há campo `alt`: `og:image` não carrega texto
 * alternativo em nenhum lugar do schema (é lido por rastreadores de rede
 * social, não por leitor de tela).
 *
 * **Correção da tarefa `ajustes/tema-escuro-logo-e-campo-de-imagem`:** a
 * prévia + upload viraram o dropzone compartilhado
 * (`apps/admin/src/shared/Dropzone.tsx`, o mesmo usado por
 * `ImageFieldEditor`) — sem nenhuma caixa de texto de URL crua, aqui como lá.
 * Este campo nunca teve um valor migrado de caminho estático para preservar
 * (era sempre `null`, por nunca ter funcionado antes da correção de QA
 * acima), então nunca existiu o caso de uso que justificaria manter um texto
 * editável ao lado do upload.
 */
export function MetadataPage() {
  const { session } = useAuth()
  const [formulario, setFormulario] = useState<FormularioMetadata | null>(null)
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState<string | null>(null)
  const [salvoComSucesso, setSalvoComSucesso] = useState(false)
  const [enviandoImagem, setEnviandoImagem] = useState(false)
  const [erroUploadImagem, setErroUploadImagem] = useState<string | null>(null)

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
      const atualizado = await apiFetch<SiteMetadata>('/api/admin/metadata', session.access_token, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formulario.title,
          description: formulario.description,
          ogImageUrl: formulario.ogImageUrl,
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

  async function handleArquivoDeImagem(arquivo: File) {
    if (!session || !formulario) {
      return
    }

    setEnviandoImagem(true)
    setErroUploadImagem(null)
    try {
      const url = await enviarImagemParaStorage(arquivo, session.access_token)
      setFormulario({ ...formulario, ogImageUrl: url })
    } catch (erro) {
      setErroUploadImagem(erro instanceof ApiError ? erro.message : 'Não foi possível enviar a imagem.')
    } finally {
      setEnviandoImagem(false)
    }
  }

  function handleRemoverImagem() {
    if (!formulario) {
      return
    }
    setFormulario({ ...formulario, ogImageUrl: null })
    setErroUploadImagem(null)
  }

  if (erroCarregamento) {
    return <Notice tipo="erro">{erroCarregamento}</Notice>
  }

  if (!formulario) {
    return <p className="text-sm text-graytxt dark:text-slate-400">Carregando metadados…</p>
  }

  return (
    // `pb-24` reserva a altura da `ActionBar` fixa no rodapé.
    <div className="flex flex-col gap-5 pb-24">
      <header>
        <h1 className="text-2xl font-semibold text-navy dark:text-slate-100">Metadados da página</h1>
        <p className="mt-1 text-sm text-graytxt dark:text-slate-400">
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

            <fieldset className="min-w-0">
              <legend className="mb-3 text-sm font-semibold text-navy dark:text-slate-100">
                Imagem de compartilhamento (og:image, opcional)
              </legend>

              {/* Dropzone compartilhado com `ImageFieldEditor`
                  (`pages/sections/components/image-field.tsx`) — sem `alt`
                  aqui (`og:image` não carrega texto alternativo em nenhum
                  lugar do schema) e sem botão "Remover imagem" separado: o
                  botão de excluir já faz parte do dropzone. */}
              <div className="w-full sm:w-56">
                <Dropzone
                  id="metadata-og-image-arquivo"
                  imageUrl={formulario.ogImageUrl ?? ''}
                  uploading={enviandoImagem}
                  onFileSelected={handleArquivoDeImagem}
                  onRemove={handleRemoverImagem}
                  ariaLabel="Enviar imagem de compartilhamento (og:image)"
                  removeLabel="Remover a imagem de compartilhamento"
                />
                {erroUploadImagem && (
                  <span role="alert" className="mt-1.5 block text-sm text-red-600 dark:text-red-400">
                    {erroUploadImagem}
                  </span>
                )}
              </div>
            </fieldset>
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
