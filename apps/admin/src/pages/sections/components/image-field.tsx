import { useState, type ChangeEvent } from 'react'
import { ApiError } from '../../../lib/api-client'
import { enviarImagemParaStorage } from '../../../lib/media-upload'

interface ImagemValor {
  url: string
  alt: string
}

interface ImageFieldEditorProps {
  label: string
  caminhoBase: string
  valor: ImagemValor
  onChange: (valor: ImagemValor) => void
  errosPorCaminho: Record<string, string>
  accessToken: string
}

/**
 * Campo de imagem (SDD § Critérios de aceitação — "Upload de imagem"):
 * upload REAL do arquivo, direto do navegador ao Supabase Storage, usando a
 * credencial temporária de `POST /api/admin/media/upload-url`
 * (`../../../lib/media-upload.ts`) — não a simplificação de colar um id de
 * mídia já usada em `painel/tela-metadados`. A URL resultante fica editável
 * logo abaixo por dois motivos, não como substituto do upload: (1) o
 * conteúdo inicial migrado (`content-schema/definir-schemas-secoes`) usa
 * caminhos estáticos da LP (`/assets/...`), que não são de forma nenhuma um
 * upload do painel, e o operador precisa conseguir mantê-los como estão sem
 * ser forçado a reenviar toda imagem só para editar um texto da mesma seção;
 * (2) é o mesmo texto que a API valida e devolve em `erros` se ficar vazio.
 *
 * `alt` é sempre obrigatório (PRD § Fluxo de UX — "o texto alternativo é um
 * campo obrigatório ao lado do upload, não um detalhe escondido"): bloqueado
 * no cliente por `SectionDetailPage` ANTES de chamar a API (ver comentário
 * lá), com o `422` real de `imageFieldSchema` como rede de segurança caso
 * esse bloqueio seja contornado.
 */
export function ImageFieldEditor({
  label,
  caminhoBase,
  valor,
  onChange,
  errosPorCaminho,
  accessToken,
}: ImageFieldEditorProps) {
  const [enviando, setEnviando] = useState(false)
  const [erroUpload, setErroUpload] = useState<string | null>(null)

  async function handleArquivo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    // Permite escolher o mesmo arquivo de novo depois de um erro, sem
    // precisar trocar de arquivo para o evento `change` disparar de novo.
    evento.target.value = ''
    if (!arquivo) {
      return
    }

    setEnviando(true)
    setErroUpload(null)
    try {
      const url = await enviarImagemParaStorage(arquivo, accessToken)
      onChange({ ...valor, url })
    } catch (erro) {
      setErroUpload(erro instanceof ApiError ? erro.message : 'Não foi possível enviar a imagem.')
    } finally {
      setEnviando(false)
    }
  }

  const caminhoUrl = `${caminhoBase}.url`
  const caminhoAlt = `${caminhoBase}.alt`

  return (
    <fieldset className="flex flex-col gap-2 rounded border border-gray-200 p-3">
      <legend className="px-1 text-sm font-medium text-gray-700">{label}</legend>

      {valor.url && (
        <img
          src={valor.url}
          alt={valor.alt}
          className="h-24 w-auto rounded border border-gray-100 object-contain"
        />
      )}

      <label className="flex flex-col gap-1 text-sm text-gray-700">
        Enviar novo arquivo
        <input type="file" accept="image/*" onChange={handleArquivo} disabled={enviando} />
      </label>
      {enviando && <span className="text-xs text-gray-500">Enviando…</span>}
      {erroUpload && (
        <span role="alert" className="text-xs text-red-600">
          {erroUpload}
        </span>
      )}

      <label htmlFor={caminhoUrl} className="flex flex-col gap-1 text-sm text-gray-700">
        URL da imagem
        <input
          id={caminhoUrl}
          type="text"
          value={valor.url}
          onChange={(evento) => onChange({ ...valor, url: evento.target.value })}
          className="rounded border border-gray-300 px-3 py-2 text-base"
        />
        {errosPorCaminho[caminhoUrl] && (
          <span role="alert" className="text-xs text-red-600">
            {errosPorCaminho[caminhoUrl]}
          </span>
        )}
      </label>

      <label htmlFor={caminhoAlt} className="flex flex-col gap-1 text-sm text-gray-700">
        Texto alternativo (alt) — obrigatório
        <input
          id={caminhoAlt}
          type="text"
          value={valor.alt}
          onChange={(evento) => onChange({ ...valor, alt: evento.target.value })}
          className="rounded border border-gray-300 px-3 py-2 text-base"
        />
        {errosPorCaminho[caminhoAlt] && (
          <span role="alert" className="text-xs text-red-600">
            {errosPorCaminho[caminhoAlt]}
          </span>
        )}
      </label>
    </fieldset>
  )
}
