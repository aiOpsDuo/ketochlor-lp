import { useState } from 'react'
import { ApiError } from '../../../lib/api-client'
import { enviarImagemParaStorage } from '../../../lib/media-upload'
import { atributosDeCampo, FormField } from '../../../shared/FormField'
import { CLASSE_ERRO_DE_CAMPO, classeDeCampo } from '../../../shared/classes'
import { Dropzone } from '../../../shared/Dropzone'

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
 * (`../../../lib/media-upload.ts`).
 *
 * **Correção da tarefa `ajustes/tema-escuro-logo-e-campo-de-imagem`:** a
 * caixa de texto "URL da imagem", editável ao lado do upload desde
 * `ajustes/estiliza-painel-admin`, foi removida por completo — pedido
 * explícito do usuário: o operador nunca deve ver nem editar uma URL crua. O
 * campo de imagem agora é só o dropzone (`../../../shared/Dropzone.tsx`,
 * compartilhado com `MetadataPage` — ver `docs/PAINEL.md`). Sem serviço de
 * resolução de mídia por id neste projeto (`media_assets` nunca é gravado de
 * verdade — gap já registrado em `painel/formulario-edicao-secao`), o estado
 * "tem imagem" vem diretamente de `valor.url` ser uma string não vazia, sem
 * nenhuma chamada de rede adicional para "buscar" a imagem.
 *
 * Preservar uma imagem já migrada (caminho estático da LP, `/assets/...`)
 * continua funcionando sem a caixa de texto: o operador simplesmente não
 * troca o arquivo, e `valor.url` permanece o que já era — só passa a não ser
 * mais VISÍVEL como texto editável.
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

  async function handleArquivo(arquivo: File) {
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

  function handleRemover() {
    onChange({ ...valor, url: '' })
    setErroUpload(null)
  }

  const caminhoUrl = `${caminhoBase}.url`
  const caminhoAlt = `${caminhoBase}.alt`
  // Sufixo próprio: o input de arquivo não corresponde a nenhum caminho do
  // conteúdo salvo (é só o gatilho do upload), então não pode reutilizar
  // `caminhoUrl`/`caminhoAlt`, que são as chaves dos erros vindos da API.
  const caminhoArquivo = `${caminhoBase}.arquivo`
  // A API ainda valida `url` (`imageFieldSchema`) e pode devolver um erro
  // nesse caminho (ex. campo vazio) — sem a caixa de texto que antes o
  // mostrava, ele aparece como texto solto abaixo do dropzone.
  const erroUrl = errosPorCaminho[caminhoUrl]
  const erroAlt = errosPorCaminho[caminhoAlt]

  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-sm font-semibold text-navy dark:text-slate-100">{label}</legend>

      <div className="flex flex-col gap-4 pt-1 sm:flex-row">
        <div className="w-full sm:w-56">
          <Dropzone
            id={caminhoArquivo}
            imageUrl={valor.url}
            imageAlt={valor.alt}
            uploading={enviando}
            onFileSelected={handleArquivo}
            onRemove={handleRemover}
            ariaLabel={`Enviar imagem para "${label}"`}
            removeLabel={`Remover a imagem de "${label}"`}
          />
          {erroUpload && (
            <span role="alert" className={`mt-1.5 block ${CLASSE_ERRO_DE_CAMPO}`}>
              {erroUpload}
            </span>
          )}
          {erroUrl && (
            <span role="alert" className={`mt-1.5 block ${CLASSE_ERRO_DE_CAMPO}`}>
              {erroUrl}
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <FormField
            id={caminhoAlt}
            label={
              <>
                Texto alternativo (alt) <span className="text-red-600 dark:text-red-400">*</span>
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
