import { rotuloDoCampo } from '../field-labels'
import { moverIndice, removerIndice } from '../list-utils'
import { itemVazio, type CampoEscalarDescritor } from '../schema-fields'
import { ScalarFieldEditor } from './scalar-field'

interface ItemListFieldEditorProps {
  label: string
  caminhoBase: string
  itens: Record<string, unknown>[]
  visibilidade: boolean[]
  camposItem: CampoEscalarDescritor[]
  onChange: (itens: Record<string, unknown>[], visibilidade: boolean[]) => void
  errosPorCaminho: Record<string, string>
}

/**
 * Repetidor de item de lista (SDD § Critérios de aceitação — "Gestão de
 * itens de lista"): adicionar, editar, remover e reordenar (mover para
 * cima/baixo — decisão de escopo desta tarefa, sem drag-and-drop). Usado por
 * `prova_autoridade.stats`, `protocolo.dosagem`, `diferenciais.items` e
 * `faq.perguntas`.
 *
 * Cada operação de reordenar/remover aplica a MESMA troca de índice ao array
 * de itens e ao array paralelo `visibilidade` (`ItemVisibilityMap` da API) —
 * é assim que os dois nunca dessincronizam entre um salvamento e outro (ver
 * `../list-utils.ts`). O checkbox "Visível" de cada item (`painel/controle-
 * visibilidade`) só troca a POSIÇÃO correspondente de `visibilidade`, nunca
 * o item em si — o item continua existindo em `itens` e volta a aparecer na
 * LP assim que reativado e a seção é salva (`PUT` reenvia os dois arrays
 * juntos, ver `section-detail-page.tsx`).
 */
export function ItemListFieldEditor({
  label,
  caminhoBase,
  itens,
  visibilidade,
  camposItem,
  onChange,
  errosPorCaminho,
}: ItemListFieldEditorProps) {
  function atualizarItem(indice: number, chave: string, valor: unknown) {
    const novosItens = itens.map((item, i) => (i === indice ? { ...item, [chave]: valor } : item))
    onChange(novosItens, visibilidade)
  }

  function mover(indice: number, direcao: -1 | 1) {
    onChange(moverIndice(itens, indice, direcao), moverIndice(visibilidade, indice, direcao))
  }

  function remover(indice: number) {
    onChange(removerIndice(itens, indice), removerIndice(visibilidade, indice))
  }

  /** Alterna só a posição `indice` de `visibilidade` — nunca mexe em `itens` (ocultar não remove). */
  function alternarVisibilidade(indice: number) {
    const novaVisibilidade = visibilidade.map((visivel, i) => (i === indice ? !visivel : visivel))
    onChange(itens, novaVisibilidade)
  }

  function adicionar() {
    onChange([...itens, itemVazio(camposItem)], [...visibilidade, true])
  }

  return (
    <fieldset className="flex flex-col gap-3 rounded border border-gray-200 p-3">
      <legend className="px-1 text-sm font-medium text-gray-700">{label}</legend>

      {itens.length === 0 && <p className="text-sm text-gray-500">Nenhum item ainda.</p>}

      {itens.map((item, indice) => (
        // Sem `id` estável no item (nenhum tipo de `content-schema` tem
        // `id`, ver `ItemVisibilityMap`) — o índice é a única chave possível
        // e é reatribuído a cada reordenação/remoção, exatamente como o
        // próprio array de conteúdo.
        <div key={indice} className="flex flex-col gap-2 rounded border border-gray-100 bg-gray-50 p-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Item {indice + 1}
            </span>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={visibilidade[indice] ?? true}
                  onChange={() => alternarVisibilidade(indice)}
                />
                {(visibilidade[indice] ?? true) ? 'Visível' : 'Oculto'}
              </label>
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

          {camposItem.map((campo) => {
            const caminho = `${caminhoBase}.${indice}.${campo.chave}`
            return (
              <ScalarFieldEditor
                key={campo.chave}
                id={caminho}
                label={rotuloDoCampo(campo.chave)}
                tipo={campo.tipo}
                value={item[campo.chave]}
                onChange={(novoValor) => atualizarItem(indice, campo.chave, novoValor)}
                erro={errosPorCaminho[caminho]}
              />
            )
          })}
        </div>
      ))}

      <button
        type="button"
        onClick={adicionar}
        className="self-start rounded bg-gray-900 px-3 py-1.5 text-xs text-white"
      >
        Adicionar item
      </button>
    </fieldset>
  )
}
