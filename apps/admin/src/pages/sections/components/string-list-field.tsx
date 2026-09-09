import { moverIndice, removerIndice } from '../list-utils'

interface StringListFieldEditorProps {
  label: string
  caminhoBase: string
  itens: string[]
  onChange: (itens: string[]) => void
  errosPorCaminho: Record<string, string>
  rotuloItem?: string
}

/**
 * Repetidor de texto simples (hoje, só `problema.paragraphs`) — adicionar/
 * remover/reordenar um parágrafo. Sem `ItemVisibilityMap` associado, de
 * propósito: a visibilidade de item (Domínio,
 * `filtrar-conteudo-publicado.ts`) cobre listas de ITEM de conteúdo
 * (perguntas, linhas de dosagem, ...), não um texto que só está dividido em
 * parágrafos por conveniência de edição — ver comentário de decisão em
 * `../schema-fields.ts`. Por isso este componente é deliberadamente separado
 * de `ItemListFieldEditor` (SRP): um não sabe nada sobre visibilidade, o
 * outro é construído em torno dela.
 */
export function StringListFieldEditor({
  label,
  caminhoBase,
  itens,
  onChange,
  errosPorCaminho,
  rotuloItem = 'Item',
}: StringListFieldEditorProps) {
  function atualizar(indice: number, valor: string) {
    onChange(itens.map((item, i) => (i === indice ? valor : item)))
  }

  function mover(indice: number, direcao: -1 | 1) {
    onChange(moverIndice(itens, indice, direcao))
  }

  function remover(indice: number) {
    onChange(removerIndice(itens, indice))
  }

  function adicionar() {
    onChange([...itens, ''])
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded border border-gray-200 p-3">
      <legend className="px-1 text-sm font-medium text-gray-700">{label}</legend>

      {itens.length === 0 && <p className="text-sm text-gray-500">Nenhum {rotuloItem.toLowerCase()} ainda.</p>}

      {itens.map((item, indice) => {
        const caminho = `${caminhoBase}.${indice}`
        return (
          <div key={indice} className="flex flex-col gap-2 rounded border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                {rotuloItem} {indice + 1}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => mover(indice, -1)}
                  disabled={indice === 0}
                  className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 disabled:opacity-40"
                >
                  Mover para cima
                </button>
                <button
                  type="button"
                  onClick={() => mover(indice, 1)}
                  disabled={indice === itens.length - 1}
                  className="rounded border border-gray-300 px-2 py-1 text-xs text-gray-700 disabled:opacity-40"
                >
                  Mover para baixo
                </button>
                <button
                  type="button"
                  onClick={() => remover(indice)}
                  className="rounded border border-red-300 px-2 py-1 text-xs text-red-700"
                >
                  Remover
                </button>
              </div>
            </div>
            <textarea
              id={caminho}
              rows={3}
              value={item}
              onChange={(evento) => atualizar(indice, evento.target.value)}
              className="rounded border border-gray-300 px-3 py-2 text-base"
            />
            {errosPorCaminho[caminho] && (
              <span role="alert" className="text-xs text-red-600">
                {errosPorCaminho[caminho]}
              </span>
            )}
          </div>
        )
      })}

      <button
        type="button"
        onClick={adicionar}
        className="self-start rounded bg-gray-900 px-3 py-1.5 text-xs text-white"
      >
        Adicionar {rotuloItem.toLowerCase()}
      </button>
    </fieldset>
  )
}
