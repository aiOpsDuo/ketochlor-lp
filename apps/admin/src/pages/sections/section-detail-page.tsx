import { CONTENT_SECTIONS, type SectionKey } from '@ketochlor/content-schema'
import { ArrowLeft, Eye, EyeOff } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../../auth/auth-context'
import { ApiError, apiFetch } from '../../lib/api-client'
import { ActionBar } from '../../shared/ActionBar'
import { Card } from '../../shared/Card'
import { Notice } from '../../shared/Notice'
import { classeDeBotao, classeDeEtiqueta } from '../../shared/classes'
import { FixedStructFieldEditor } from './components/fixed-struct-field'
import { ImageFieldEditor } from './components/image-field'
import { ItemListFieldEditor } from './components/item-list-field'
import { ScalarFieldEditor } from './components/scalar-field'
import { StringListFieldEditor } from './components/string-list-field'
import { rotuloDoCampo } from './field-labels'
import { descreverCamposDaSecao, type CampoDescritor } from './schema-fields'
import { SECTION_LABELS } from './section-labels'
import type { SecaoDetalhe } from './section-detalhe'

function ehChaveDeSecao(key: string | undefined): key is SectionKey {
  return !!key && Object.prototype.hasOwnProperty.call(CONTENT_SECTIONS, key)
}

/** `formData` já veio validado do servidor contra o schema Zod da seção — os casts abaixo só dão nome ao formato que a própria API garante. */
function comoRegistro(valor: unknown): Record<string, unknown> {
  return (valor ?? {}) as Record<string, unknown>
}
function comoArrayDeRegistros(valor: unknown): Record<string, unknown>[] {
  return Array.isArray(valor) ? (valor as Record<string, unknown>[]) : []
}
function comoArrayDeStrings(valor: unknown): string[] {
  return Array.isArray(valor) ? (valor as string[]) : []
}
function comoImagem(valor: unknown): { url: string; alt: string } {
  const registro = comoRegistro(valor)
  return {
    url: typeof registro.url === 'string' ? registro.url : '',
    alt: typeof registro.alt === 'string' ? registro.alt : '',
  }
}

/** Visibilidade normalizada de um campo de lista-item: mesmo tamanho do conteúdo, `true` por padrão (SDD/Domínio: índice ausente = visível). */
function visibilidadeNormalizada(bruta: boolean[] | undefined, tamanho: number): boolean[] {
  return Array.from({ length: tamanho }, (_valor, indice) => bruta?.[indice] ?? true)
}

interface EstadoDeErro {
  mensagem: string
  porCampo: Record<string, string>
}

function erroDeApiParaEstado(erro: ApiError): EstadoDeErro {
  if (erro.erros && erro.erros.length > 0) {
    const porCampo: Record<string, string> = {}
    for (const item of erro.erros) {
      porCampo[item.campo] = porCampo[item.campo] ? `${porCampo[item.campo]} ${item.mensagem}` : item.mensagem
    }
    return { mensagem: 'Corrija os campos destacados abaixo antes de salvar.', porCampo }
  }
  return { mensagem: erro.message, porCampo: {} }
}

/**
 * Tela de edição de uma seção (`/sections/:key`) — formulário GERADO a
 * partir do schema Zod de `@ketochlor/content-schema`
 * (`descreverCamposDaSecao`), não 11 formulários hardcoded (tarefa
 * `painel/formulario-edicao-secao`). Busca o documento completo via `GET
 * /api/admin/sections/:key` (`data` + `itemVisibility` + `isPublished`) e
 * salva via `PUT /api/admin/sections/:key`.
 *
 * **Decisão de sincronia (`itemVisibility`):** este formulário SEMPRE envia
 * `data` e `itemVisibility` juntos no mesmo `PUT`, nunca um sem o outro — a
 * alternativa (só enviar `itemVisibility` quando "algo mudou" numa lista)
 * exigiria detectar exatamente esse "algo mudou", uma superfície de bug
 * maior do que sempre reconstruir o mapa completo a partir do estado local
 * (que já é, por construção, mantido em sincronia índice a índice pelas
 * operações de `ItemListFieldEditor`/`list-utils.ts`). Ver nota de design em
 * `agent_context/PLAN.md` (após `api/dominio-esquemas-e-regras`) e o
 * comentário de `ContentSectionsRepository.atualizarConteudo`
 * (`apps/api/src/domain/portas/content-sections.repository.ts`).
 */
export function SectionDetailPage() {
  const { key: chaveDaRota } = useParams<{ key: string }>()
  const { session } = useAuth()

  const [secao, setSecao] = useState<SecaoDetalhe | null>(null)
  const [erroCarregamento, setErroCarregamento] = useState<string | null>(null)
  const [formData, setFormData] = useState<Record<string, unknown> | null>(null)
  const [visibilidade, setVisibilidade] = useState<Record<string, boolean[]>>({})
  const [salvando, setSalvando] = useState(false)
  const [erroSalvar, setErroSalvar] = useState<EstadoDeErro | null>(null)
  const [salvoComSucesso, setSalvoComSucesso] = useState(false)
  const [alternandoVisibilidade, setAlternandoVisibilidade] = useState(false)
  const [erroVisibilidade, setErroVisibilidade] = useState<string | null>(null)

  const chaveValida = ehChaveDeSecao(chaveDaRota)
  const descritores = useMemo<CampoDescritor[]>(
    () => (chaveValida ? descreverCamposDaSecao(chaveDaRota) : []),
    [chaveValida, chaveDaRota],
  )

  useEffect(() => {
    // `ProtectedRoute` só renderiza esta árvore com sessão presente — mesma
    // guarda explícita de `SectionListPage`/`MetadataPage` (G26).
    if (!session || !chaveValida) {
      return
    }

    let cancelado = false
    apiFetch<SecaoDetalhe>(`/api/admin/sections/${chaveDaRota}`, session.access_token)
      .then((resultado) => {
        if (cancelado) {
          return
        }
        setSecao(resultado)
        setFormData(resultado.data)
        const visibilidadeInicial: Record<string, boolean[]> = {}
        for (const descritor of descreverCamposDaSecao(chaveDaRota)) {
          if (descritor.tipo === 'lista-item') {
            const tamanho = comoArrayDeRegistros(resultado.data[descritor.chave]).length
            visibilidadeInicial[descritor.chave] = visibilidadeNormalizada(
              resultado.itemVisibility[descritor.chave],
              tamanho,
            )
          }
        }
        setVisibilidade(visibilidadeInicial)
      })
      .catch((erro: unknown) => {
        if (cancelado) {
          return
        }
        setErroCarregamento(
          erro instanceof ApiError ? erro.message : 'Não foi possível carregar a seção.',
        )
      })

    return () => {
      cancelado = true
    }
  }, [session, chaveValida, chaveDaRota])

  function atualizarCampo(chave: string, valor: unknown) {
    setFormData((atual) => (atual ? { ...atual, [chave]: valor } : atual))
  }

  function atualizarListaDeItens(chave: string, itens: Record<string, unknown>[], vis: boolean[]) {
    setFormData((atual) => (atual ? { ...atual, [chave]: itens } : atual))
    setVisibilidade((atual) => ({ ...atual, [chave]: vis }))
  }

  /**
   * Bloqueio no CLIENTE do `alt` vazio em campo de imagem (critério de
   * "pronto" da tarefa, item 5) — a API também recusa com `422`
   * (`imageFieldSchema`), mas aqui o operador vê o problema sem sequer
   * disparar a requisição. Só olha campos de imagem de TOPO de seção: nenhum
   * item de lista ou subestrutura fixa das 11 seções hoje tem um campo de
   * imagem aninhado (ver `schema-fields.ts`).
   */
  function validarAltDeImagens(dados: Record<string, unknown>): Record<string, string> {
    const porCampo: Record<string, string> = {}
    for (const descritor of descritores) {
      if (descritor.tipo !== 'imagem') {
        continue
      }
      const imagem = comoImagem(dados[descritor.chave])
      if (imagem.alt.trim().length === 0) {
        porCampo[`${descritor.chave}.alt`] = 'O texto alternativo (alt) da imagem é obrigatório.'
      }
    }
    return porCampo
  }

  async function handleSubmit(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault()
    if (!session || !formData || !chaveValida) {
      return
    }

    setSalvoComSucesso(false)

    const errosDeAlt = validarAltDeImagens(formData)
    if (Object.keys(errosDeAlt).length > 0) {
      setErroSalvar({ mensagem: 'Corrija os campos destacados abaixo antes de salvar.', porCampo: errosDeAlt })
      return
    }

    setSalvando(true)
    setErroSalvar(null)

    // Reconstrói o `ItemVisibilityMap` inteiro a partir do estado local
    // atual — sempre para TODOS os campos de lista-item da seção, mesmo os
    // que não mudaram nesta edição, para nunca correr o risco de enviar
    // `data` sem o `itemVisibility` correspondente (ver comentário da
    // função do componente).
    const itemVisibilityFinal: Record<string, boolean[]> = {}
    for (const descritor of descritores) {
      if (descritor.tipo === 'lista-item') {
        const tamanho = comoArrayDeRegistros(formData[descritor.chave]).length
        itemVisibilityFinal[descritor.chave] = visibilidadeNormalizada(
          visibilidade[descritor.chave],
          tamanho,
        )
      }
    }

    try {
      const atualizado = await apiFetch<SecaoDetalhe>(
        `/api/admin/sections/${chaveDaRota}`,
        session.access_token,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: formData, itemVisibility: itemVisibilityFinal }),
        },
      )
      setSecao(atualizado)
      setFormData(atualizado.data)
      const visibilidadeAtualizada: Record<string, boolean[]> = {}
      for (const descritor of descritores) {
        if (descritor.tipo === 'lista-item') {
          const tamanho = comoArrayDeRegistros(atualizado.data[descritor.chave]).length
          visibilidadeAtualizada[descritor.chave] = visibilidadeNormalizada(
            atualizado.itemVisibility[descritor.chave],
            tamanho,
          )
        }
      }
      setVisibilidade(visibilidadeAtualizada)
      setSalvoComSucesso(true)
    } catch (erro) {
      // Mantém `formData` como está — o operador não perde o que já editou
      // (critério de "pronto" 6) — e mostra o erro real devolvido pela API,
      // por campo quando possível.
      setErroSalvar(erro instanceof ApiError ? erroDeApiParaEstado(erro) : { mensagem: 'Não foi possível salvar a seção.', porCampo: {} })
    } finally {
      setSalvando(false)
    }
  }

  /**
   * Alterna a publicação da SEÇÃO INTEIRA (`painel/controle-visibilidade`,
   * distinto de ocultar um item de lista): `PATCH
   * /api/admin/sections/:key/visibility` não recebe corpo, só inverte
   * `is_published` no servidor e devolve o documento atualizado — por isso
   * a chamada não depende de `formData`/`handleSubmit` e não precisa que o
   * operador esteja no meio de uma edição de texto para funcionar. O novo
   * `isPublished` (e `updatedAt`) vem sempre da RESPOSTA da API, nunca
   * invertido otimisticamente no cliente, para a tela nunca mostrar um
   * estado que o servidor não confirmou.
   */
  async function alternarVisibilidadeDaSecao() {
    if (!session || !chaveValida || !secao) {
      return
    }
    setAlternandoVisibilidade(true)
    setErroVisibilidade(null)
    try {
      const atualizado = await apiFetch<SecaoDetalhe>(
        `/api/admin/sections/${chaveDaRota}/visibility`,
        session.access_token,
        { method: 'PATCH' },
      )
      setSecao(atualizado)
    } catch (erro) {
      setErroVisibilidade(
        erro instanceof ApiError ? erro.message : 'Não foi possível alternar a visibilidade da seção.',
      )
    } finally {
      setAlternandoVisibilidade(false)
    }
  }

  if (!chaveValida) {
    return <Notice tipo="erro">"{chaveDaRota}" não é uma das 11 seções do CMS.</Notice>
  }

  if (erroCarregamento) {
    return <Notice tipo="erro">{erroCarregamento}</Notice>
  }

  if (!formData || !secao) {
    return <p className="text-sm text-graytxt dark:text-slate-400">Carregando seção…</p>
  }

  const porCampo = erroSalvar?.porCampo ?? {}

  return (
    // `pb-24` reserva a altura da `ActionBar` fixa no rodapé — sem isso o
    // último campo do formulário fica coberto por ela.
    <div className="flex flex-col gap-5 pb-24">
      <div>
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-graytxt transition hover:text-blue-institutional dark:text-slate-400 dark:hover:text-blue-300"
        >
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Voltar para as seções
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-navy dark:text-slate-100">
          {SECTION_LABELS[chaveDaRota]}
        </h1>
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <span className={classeDeEtiqueta(secao.isPublished)}>
            {secao.isPublished ? 'Publicada' : 'Não publicada'}
          </span>
          <button
            type="button"
            onClick={alternarVisibilidadeDaSecao}
            disabled={alternandoVisibilidade}
            className={classeDeBotao('secundario', 'pequeno')}
          >
            {secao.isPublished ? (
              <EyeOff aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <Eye aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {alternandoVisibilidade
              ? 'Atualizando…'
              : secao.isPublished
                ? 'Ocultar seção'
                : 'Publicar seção'}
          </button>
          <p className="text-xs text-graytxt dark:text-slate-400">
            Uma seção oculta continua editável aqui, mas não aparece na página publicada.
          </p>
        </div>
        {erroVisibilidade && (
          <Notice tipo="erro" className="mt-3">
            {erroVisibilidade}
          </Notice>
        )}
      </Card>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {/* Um cartão por campo de topo de seção: é o `Card` que dá a moldura
            branca, então os editores compostos (imagem, listas, subestrutura)
            trazem só o próprio `fieldset`/`legend`, sem borda própria. */}
        {descritores.map((descritor) => (
          <Card key={descritor.chave}>
            <CampoDaSecao
              descritor={descritor}
              formData={formData}
              visibilidade={visibilidade}
              onAtualizarCampo={atualizarCampo}
              onAtualizarListaDeItens={atualizarListaDeItens}
              errosPorCaminho={porCampo}
              accessToken={session?.access_token ?? ''}
            />
          </Card>
        ))}

        <ActionBar>
          {erroSalvar && (
            <Notice tipo="erro" className="mr-auto">
              {erroSalvar.mensagem}
            </Notice>
          )}
          {salvoComSucesso && (
            <Notice tipo="sucesso" className="mr-auto">
              Seção salva com sucesso.
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

interface CampoDaSecaoProps {
  descritor: CampoDescritor
  formData: Record<string, unknown>
  visibilidade: Record<string, boolean[]>
  onAtualizarCampo: (chave: string, valor: unknown) => void
  onAtualizarListaDeItens: (chave: string, itens: Record<string, unknown>[], vis: boolean[]) => void
  errosPorCaminho: Record<string, string>
  accessToken: string
}

/** Escolhe o editor certo para um campo de topo de seção, a partir do descritor gerado pelo schema (`schema-fields.ts`). */
function CampoDaSecao({
  descritor,
  formData,
  visibilidade,
  onAtualizarCampo,
  onAtualizarListaDeItens,
  errosPorCaminho,
  accessToken,
}: CampoDaSecaoProps) {
  const label = rotuloDoCampo(descritor.chave)

  switch (descritor.tipo) {
    case 'texto':
      return (
        <ScalarFieldEditor
          id={descritor.chave}
          label={label}
          tipo="texto"
          value={formData[descritor.chave]}
          onChange={(valor) => onAtualizarCampo(descritor.chave, valor)}
          erro={errosPorCaminho[descritor.chave]}
        />
      )
    case 'imagem':
      return (
        <ImageFieldEditor
          label={label}
          caminhoBase={descritor.chave}
          valor={comoImagem(formData[descritor.chave])}
          onChange={(valor) => onAtualizarCampo(descritor.chave, valor)}
          errosPorCaminho={errosPorCaminho}
          accessToken={accessToken}
        />
      )
    case 'lista-texto':
      return (
        <StringListFieldEditor
          label={label}
          caminhoBase={descritor.chave}
          itens={comoArrayDeStrings(formData[descritor.chave])}
          onChange={(itens) => onAtualizarCampo(descritor.chave, itens)}
          errosPorCaminho={errosPorCaminho}
          rotuloItem="Parágrafo"
        />
      )
    case 'lista-item':
      return (
        <ItemListFieldEditor
          label={label}
          caminhoBase={descritor.chave}
          itens={comoArrayDeRegistros(formData[descritor.chave])}
          visibilidade={visibilidade[descritor.chave] ?? []}
          camposItem={descritor.camposItem}
          onChange={(itens, vis) => onAtualizarListaDeItens(descritor.chave, itens, vis)}
          errosPorCaminho={errosPorCaminho}
        />
      )
    case 'estrutura-fixa':
      return (
        <FixedStructFieldEditor
          label={label}
          caminhoBase={descritor.chave}
          valor={comoRegistro(formData[descritor.chave])}
          campos={descritor.campos}
          onChange={(valor) => onAtualizarCampo(descritor.chave, valor)}
          errosPorCaminho={errosPorCaminho}
        />
      )
    default:
      return null
  }
}
