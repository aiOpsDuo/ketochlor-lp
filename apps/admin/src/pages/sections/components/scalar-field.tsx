import type { TipoEscalar } from '../schema-fields'

const CLASSE_CAMPO = 'rounded border border-gray-300 px-3 py-2 text-base'
// Acima deste tamanho (ou com quebra de linha), o campo de texto vira uma
// `<textarea>` em vez de `<input>` — decisão deliberada desta tarefa: o
// schema Zod não distingui "texto curto" de "parágrafo" (os dois são só
// `z.string()`), então o widget certo é decidido a partir do CONTEÚDO atual
// do campo, não de uma segunda anotação de schema que não existe
// (proporcionalidade — não introduzir metadado novo em `content-schema` só
// para isto).
const LIMIAR_MULTILINHA = 60

interface ScalarFieldEditorProps {
  id: string
  label: string
  tipo: TipoEscalar
  value: unknown
  onChange: (valor: string | number) => void
  erro?: string
}

/**
 * Editor de um único campo escalar (texto ou número) — a folha da árvore de
 * renderização dirigida pelo schema. Reaproveitado tanto para um campo de
 * topo de seção quanto para um campo dentro de um item de lista ou de uma
 * subestrutura fixa (SRP: um único lugar decide como editar "um texto" ou
 * "um número", nunca duplicado por contexto).
 */
export function ScalarFieldEditor({ id, label, tipo, value, onChange, erro }: ScalarFieldEditorProps) {
  if (tipo === 'numero') {
    const valorNumero = typeof value === 'number' ? value : Number(value ?? 0)
    return (
      <label htmlFor={id} className="flex flex-col gap-1 text-sm text-gray-700">
        {label}
        <input
          id={id}
          type="number"
          value={Number.isNaN(valorNumero) ? '' : valorNumero}
          onChange={(evento) => {
            const novoValor = evento.target.valueAsNumber
            onChange(Number.isNaN(novoValor) ? 0 : novoValor)
          }}
          className={CLASSE_CAMPO}
        />
        {erro && (
          <span role="alert" className="text-xs text-red-600">
            {erro}
          </span>
        )}
      </label>
    )
  }

  const texto = typeof value === 'string' ? value : ''
  const multilinha = texto.length > LIMIAR_MULTILINHA || texto.includes('\n')

  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm text-gray-700">
      {label}
      {multilinha ? (
        <textarea
          id={id}
          rows={4}
          value={texto}
          onChange={(evento) => onChange(evento.target.value)}
          className={CLASSE_CAMPO}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={texto}
          onChange={(evento) => onChange(evento.target.value)}
          className={CLASSE_CAMPO}
        />
      )}
      {erro && (
        <span role="alert" className="text-xs text-red-600">
          {erro}
        </span>
      )}
    </label>
  )
}
