import { ImageOff, Loader2 } from 'lucide-react'
import { useState, type ChangeEvent } from 'react'
import { ApiError } from '../../../lib/api-client'
import { enviarImagemParaStorage } from '../../../lib/media-upload'
import { atributosDeCampo, FormField } from '../../../shared/FormField'
import { CLASSE_ROTULO, classeDeCampo } from '../../../shared/classes'

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

const CLASSE_INPUT_DE_ARQUIVO =
  'block w-full cursor-pointer text-sm text-graytxt file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-slate-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50'

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
  // Sufixo próprio: o input de arquivo não corresponde a nenhum caminho do
  // conteúdo salvo (é só o gatilho do upload), então não pode reutilizar
  // `caminhoUrl`/`caminhoAlt`, que são as chaves dos erros vindos da API.
  const caminhoArquivo = `${caminhoBase}.arquivo`
  const erroUrl = errosPorCaminho[caminhoUrl]
  const erroAlt = errosPorCaminho[caminhoAlt]

  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-sm font-semibold text-navy">{label}</legend>

      <div className="flex flex-col gap-4 pt-1 sm:flex-row">
        {/* Miniatura sobre fundo neutro, tamanho fixo: a imagem real pode ser
            de qualquer proporção, e `object-contain` a mostra inteira sem
            distorcer nem empurrar o formulário para baixo. */}
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-cardborder bg-lighttint">
          {valor.url ? (
            <img src={valor.url} alt={valor.alt} className="h-full w-full object-contain" />
          ) : (
            <ImageOff aria-hidden="true" className="h-6 w-6 text-slate-400" />
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            {/* `<label htmlFor>` real, e não um `<span>` de aparência de
                rótulo: um input de arquivo sem rótulo associado é anunciado
                por leitor de tela só como "botão escolher arquivo", sem dizer
                de qual campo de imagem ele é. */}
            <label htmlFor={caminhoArquivo} className={CLASSE_ROTULO}>
              Enviar novo arquivo
            </label>
            <input
              id={caminhoArquivo}
              type="file"
              accept="image/*"
              onChange={handleArquivo}
              disabled={enviando}
              className={CLASSE_INPUT_DE_ARQUIVO}
            />
            {enviando && (
              <span className="flex items-center gap-1.5 text-xs text-graytxt">
                <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                Enviando…
              </span>
            )}
            {erroUpload && (
              <span role="alert" className="text-sm text-red-600">
                {erroUpload}
              </span>
            )}
          </div>

          <FormField
            id={caminhoUrl}
            label="URL da imagem"
            ajuda="Mantenha o caminho atual para preservar uma imagem já publicada na página."
            erro={erroUrl}
          >
            <input
              {...atributosDeCampo(caminhoUrl, { temAjuda: true, erro: erroUrl })}
              type="text"
              value={valor.url}
              onChange={(evento) => onChange({ ...valor, url: evento.target.value })}
              className={classeDeCampo(Boolean(erroUrl))}
            />
          </FormField>

          <FormField
            id={caminhoAlt}
            label={
              <>
                Texto alternativo (alt) <span className="text-red-600">*</span>
              </>
            }
            ajuda="Descreve a imagem para leitores de tela e buscadores — obrigatório."
            erro={erroAlt}
          >
            <input
              {...atributosDeCampo(caminhoAlt, { temAjuda: true, erro: erroAlt })}
              type="text"
              value={valor.alt}
              onChange={(evento) => onChange({ ...valor, alt: evento.target.value })}
              className={classeDeCampo(Boolean(erroAlt))}
            />
          </FormField>
        </div>
      </div>
    </fieldset>
  )
}
