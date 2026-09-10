import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from 'lucide-react'
import { classeDeBotao } from '../../../shared/classes'
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
 * `../list-utils.ts`). O botão "Visível"/"Oculto" de cada item (`painel/
 * controle-visibilidade`) só troca a POSIÇÃO correspondente de
 * `visibilidade`, nunca o item em si — o item continua existindo em `itens` e
 * volta a aparecer na LP assim que reativado e a seção é salva (`PUT` reenvia
 * os dois arrays juntos, ver `section-detail-page.tsx`).
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
    <fieldset className="min-w-0">
      <legend className="mb-3 text-sm font-semibold text-navy dark:text-slate-100">{label}</legend>

      <div className="flex flex-col gap-3 pt-1">
        {itens.length === 0 && (
          <p className="rounded-lg border border-dashed border-cardborder px-3 py-6 text-center text-sm text-graytxt dark:border-slate-700 dark:text-slate-400">
            Nenhum item ainda.
          </p>
        )}

        {itens.map((item, indice) => {
          const visivel = visibilidade[indice] ?? true
          return (
            // Sem `id` estável no item (nenhum tipo de `content-schema` tem
            // `id`, ver `ItemVisibilityMap`) — o índice é a única chave possível
            // e é reatribuído a cada reordenação/remoção, exatamente como o
            // próprio array de conteúdo.
            <div
              key={indice}
              className={`rounded-lg border border-cardborder bg-lighttint p-3 dark:border-slate-700 dark:bg-slate-800/60 ${visivel ? '' : 'opacity-70'}`}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-graytxt dark:text-slate-400">
                  Item {indice + 1}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => alternarVisibilidade(indice)}
                    aria-pressed={visivel}
                    className={classeDeBotao('secundario', 'pequeno')}
                  >
                    {visivel ? (
                      <Eye aria-hidden="true" className="h-3.5 w-3.5" />
                    ) : (
                      <EyeOff aria-hidden="true" className="h-3.5 w-3.5" />
                    )}
                    {visivel ? 'Visível' : 'Oculto'}
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(indice, -1)}
                    disabled={indice === 0}
                    aria-label={`Mover item ${indice + 1} para cima`}
                    className={classeDeBotao('secundario', 'pequeno')}
                  >
                    <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(indice, 1)}
                    disabled={indice === itens.length - 1}
                    aria-label={`Mover item ${indice + 1} para baixo`}
                    className={classeDeBotao('secundario', 'pequeno')}
                  >
                    <ArrowDown aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => remover(indice)}
                    className={classeDeBotao('perigo', 'pequeno')}
                  >
                    <Trash2 aria-hidden="true" className="h-3.5 w-3.5" />
                    Remover
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-3">
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
            </div>
          )
        })}

        <button
          type="button"
          onClick={adicionar}
          className={classeDeBotao('secundario', 'pequeno', 'self-start')}
        >
          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          Adicionar item
        </button>
      </div>
    </fieldset>
  )
}
