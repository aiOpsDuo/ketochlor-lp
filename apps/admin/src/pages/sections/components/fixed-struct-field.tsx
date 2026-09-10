import { rotuloDoCampo } from '../field-labels'
import type { CampoEscalarDescritor } from '../schema-fields'
import { ScalarFieldEditor } from './scalar-field'

interface FixedStructFieldEditorProps {
  label: string
  caminhoBase: string
  valor: Record<string, unknown>
  campos: CampoEscalarDescritor[]
  onChange: (valor: Record<string, unknown>) => void
  errosPorCaminho: Record<string, string>
}

/**
 * Subestrutura fixa (`fenotipos.agudo`/`.cronico`, `mecanismo.cetoconazol`/
 * `.clorexidina`, `protocolo.closing`): campos editáveis, cardinalidade
 * fechada — DE PROPÓSITO, sem nenhum botão de adicionar/remover, ao
 * contrário de `ItemListFieldEditor` (SDD § Critérios de aceitação —
 * "Gestão de itens de lista": "Tentar adicionar um item a `fenotipos` ou às
 * colunas de `mecanismo` não é uma operação exposta pelo painel").
 */
export function FixedStructFieldEditor({
  label,
  caminhoBase,
  valor,
  campos,
  onChange,
  errosPorCaminho,
}: FixedStructFieldEditorProps) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-3 text-sm font-semibold text-navy">{label}</legend>
      <div className="flex flex-col gap-4 pt-1">
        {campos.map((campo) => {
          const caminho = `${caminhoBase}.${campo.chave}`
          return (
            <ScalarFieldEditor
              key={campo.chave}
              id={caminho}
              label={rotuloDoCampo(campo.chave)}
              tipo={campo.tipo}
              value={valor[campo.chave]}
              onChange={(novoValor) => onChange({ ...valor, [campo.chave]: novoValor })}
              erro={errosPorCaminho[caminho]}
            />
          )
        })}
      </div>
    </fieldset>
  )
}
