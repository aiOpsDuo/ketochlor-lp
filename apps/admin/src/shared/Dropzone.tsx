import { ImageUp, Loader2, Trash2 } from 'lucide-react'
import type { ChangeEvent } from 'react'

interface DropzoneProps {
  /** `id` do `<input type="file">` interno — não corresponde a nenhum caminho de conteúdo salvo, só o gatilho do upload. */
  id: string
  /** URL pública já enviada, ou string vazia quando o campo ainda não tem imagem. */
  imageUrl: string
  /** `alt` da prévia — decorativo (`""`) quando a imagem em si não carrega texto alternativo, ex. `og:image`. */
  imageAlt?: string
  uploading: boolean
  disabled?: boolean
  onFileSelected: (arquivo: File) => void
  onRemove: () => void
  /** Nome acessível do dropzone inteiro — precisa dizer qual campo, quando há mais de um na mesma tela. */
  ariaLabel: string
  /** `aria-label` do botão de excluir — mesmo motivo de `ariaLabel`. */
  removeLabel: string
}

/**
 * Extrai o nome do arquivo a partir do último segmento da URL pública,
 * decodificado — só para mostrar abaixo da prévia (detalhe visual opcional
 * do padrão de referência, `agent_context/PLAN.md` §
 * `tema-escuro-logo-e-campo-de-imagem`). `null` quando a URL não é
 * absoluta (ex. um caminho estático relativo já migrado) ou não tem nome de
 * arquivo reconhecível — nesse caso simplesmente não mostra nada, não é uma
 * condição de erro.
 */
function nomeDoArquivoDaUrl(url: string): string | null {
  try {
    const segmentos = new URL(url).pathname.split('/')
    const ultimo = segmentos[segmentos.length - 1]
    return ultimo ? decodeURIComponent(ultimo) : null
  } catch {
    return null
  }
}

/**
 * Campo de imagem como área de soltar/enviar (SDD § Critérios de aceitação —
 * "Upload de imagem"; correção da tarefa
 * `ajustes/tema-escuro-logo-e-campo-de-imagem`): sem nenhuma caixa de texto
 * de URL crua, só upload real com prévia, estado de envio e exclusão.
 * Compartilhado por `ImageFieldEditor` (imagens de seção, com `alt`
 * obrigatório ao lado) e `MetadataPage` (imagem de metadados, sem `alt`) —
 * mesma disciplina de extração de `Card`/`Notice`/`ActionBar`
 * (`docs/PAINEL.md`).
 *
 * O botão de excluir é IRMÃO do `<label>`, num `div` com `position:
 * relative` em volta dos dois — nunca um filho do `<label>` — porque um
 * clique nele, dentro do `<label>`, borbulharia até o `<input type="file">`
 * associado e abriria o seletor de arquivo por engano, exatamente quando a
 * intenção do operador é o oposto (remover, não trocar).
 *
 * Este projeto não tem um serviço de resolução de mídia por id
 * (`media_assets` nunca é gravado de verdade — gap já registrado em
 * `painel/formulario-edicao-secao`): o estado "tem imagem" vem diretamente
 * de `imageUrl` ser uma string não vazia, de forma síncrona — sem nenhuma
 * chamada de rede para "buscar" a mídia antes de decidir o que mostrar.
 *
 * **Sem percentual de progresso real:** o SDK do Supabase Storage
 * (`@supabase/storage-js`, usado por `enviarImagemParaStorage`) não expõe
 * eventos de progresso de upload — só uma Promise que resolve ao final.
 * Fabricar uma porcentagem sem dado real por trás enganaria mais do que
 * ajudaria, então o estado de envio aqui é só o spinner indeterminado + o
 * texto "Enviando…".
 */
export function Dropzone({
  id,
  imageUrl,
  imageAlt = '',
  uploading,
  disabled = false,
  onFileSelected,
  onRemove,
  ariaLabel,
  removeLabel,
}: DropzoneProps) {
  const temImagem = imageUrl.length > 0
  const nomeDoArquivo = temImagem ? nomeDoArquivoDaUrl(imageUrl) : null
  const desabilitado = disabled || uploading

  function handleChange(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0]
    // Permite escolher o mesmo arquivo de novo depois de um erro, sem
    // precisar trocar de arquivo para o evento `change` disparar de novo
    // (mesmo padrão já usado antes desta extração).
    evento.target.value = ''
    if (arquivo) {
      onFileSelected(arquivo)
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <label
          htmlFor={id}
          aria-label={ariaLabel}
          className={[
            'relative flex h-40 w-full items-center justify-center overflow-hidden rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 transition-colors dark:border-slate-600 dark:bg-slate-800',
            desabilitado
              ? 'cursor-not-allowed opacity-60'
              : 'cursor-pointer hover:border-slate-400 hover:bg-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-700/60',
          ].join(' ')}
        >
          <input
            id={id}
            type="file"
            accept="image/*"
            onChange={handleChange}
            disabled={desabilitado}
            className="peer sr-only"
          />
          {/* O `<input>` fica invisível (`sr-only`) mas navegável por
              teclado — o anel de foco precisa aparecer em algo VISÍVEL, daí
              este elemento ligado a ele por `peer`. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-lg peer-focus-visible:ring-2 peer-focus-visible:ring-slate-500 peer-focus-visible:ring-offset-2 dark:peer-focus-visible:ring-slate-400"
          />

          {uploading ? (
            <span className="flex flex-col items-center gap-2 text-sm text-graytxt dark:text-slate-400">
              <Loader2 aria-hidden="true" className="h-6 w-6 animate-spin" />
              Enviando…
            </span>
          ) : temImagem ? (
            <img src={imageUrl} alt={imageAlt} className="h-full w-full object-contain" />
          ) : (
            <span className="flex flex-col items-center gap-2 px-4 text-center text-sm text-graytxt dark:text-slate-400">
              <ImageUp aria-hidden="true" className="h-9 w-9" />
              Clique para enviar uma imagem
            </span>
          )}
        </label>

        {temImagem && !uploading && (
          <button
            type="button"
            onClick={onRemove}
            disabled={disabled}
            aria-label={removeLabel}
            className="absolute bottom-2 right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-red-100/90 text-red-700 shadow-md transition-colors hover:bg-red-600 hover:text-white focus-visible:bg-red-600 focus-visible:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 dark:bg-red-950/80 dark:text-red-300 dark:hover:bg-red-600 dark:hover:text-white"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        )}
      </div>

      {nomeDoArquivo && !uploading && (
        <span className="truncate text-xs text-graytxt dark:text-slate-400">{nomeDoArquivo}</span>
      )}
    </div>
  )
}
