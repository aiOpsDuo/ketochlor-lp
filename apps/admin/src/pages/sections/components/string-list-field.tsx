import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { atributosDeCampo, idDeErroDeCampo } from '../../../shared/FormField'
import { CLASSE_ERRO_DE_CAMPO, classeDeBotao, classeDeCampo } from '../../../shared/classes'
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

  const rotuloItemMinusculo = rotuloItem.toLowerCase()

  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-sm font-semibold text-navy dark:text-slate-100">{label}</legend>

      <div className="flex flex-col gap-3 pt-1">
        {itens.length === 0 && (
          <p className="rounded-lg border border-dashed border-cardborder px-3 py-6 text-center text-sm text-graytxt dark:border-slate-700 dark:text-slate-400">
            Nenhum {rotuloItemMinusculo} ainda.
          </p>
        )}

        {itens.map((item, indice) => {
          const caminho = `${caminhoBase}.${indice}`
          const erro = errosPorCaminho[caminho]
          const nomeDoItem = `${rotuloItem} ${indice + 1}`
          return (
            <div
              key={indice}
              className="rounded-lg border border-cardborder bg-lighttint p-3 dark:border-slate-700 dark:bg-slate-800/60"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-graytxt dark:text-slate-400">
                  {nomeDoItem}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => mover(indice, -1)}
                    disabled={indice === 0}
                    aria-label={`Mover ${rotuloItemMinusculo} ${indice + 1} para cima`}
                    className={classeDeBotao('secundario', 'pequeno')}
                  >
                    <ArrowUp aria-hidden="true" className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => mover(indice, 1)}
                    disabled={indice === itens.length - 1}
                    aria-label={`Mover ${rotuloItemMinusculo} ${indice + 1} para baixo`}
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
              <textarea
                {...atributosDeCampo(caminho, { erro })}
                aria-label={nomeDoItem}
                rows={3}
                value={item}
                onChange={(evento) => atualizar(indice, evento.target.value)}
                className={classeDeCampo(Boolean(erro))}
              />
              {erro && (
                <span
                  id={idDeErroDeCampo(caminho)}
                  role="alert"
                  className={`mt-1 block ${CLASSE_ERRO_DE_CAMPO}`}
                >
                  {erro}
                </span>
              )}
            </div>
          )
        })}

        <button
          type="button"
          onClick={adicionar}
          className={classeDeBotao('secundario', 'pequeno', 'self-start')}
        >
          <Plus aria-hidden="true" className="h-3.5 w-3.5" />
          Adicionar {rotuloItemMinusculo}
        </button>
      </div>
    </fieldset>
  )
}
