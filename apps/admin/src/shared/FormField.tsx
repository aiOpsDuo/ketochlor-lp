import type { ReactNode } from 'react'
import { CLASSE_AJUDA, CLASSE_ERRO_DE_CAMPO, CLASSE_ROTULO } from './classes'

interface FormFieldProps {
  /** `id` do controle — o mesmo passado a `atributosDeCampo`. */
  id: string
  label: ReactNode
  /** Texto de ajuda opcional, abaixo do controle. */
  ajuda?: ReactNode
  /** Mensagem de erro do campo, quando houver. */
  erro?: string
  /** O controle em si (`<input>`, `<textarea>`, ...), já com `classeDeCampo`. */
  children: ReactNode
}

/** Sufixos dos ids auxiliares — usados aqui e por `atributosDeCampo`, precisam casar. */
function idDaAjuda(id: string): string {
  return `${id}-ajuda`
}

/**
 * Id do elemento que carrega a mensagem de erro de um campo. Exportado para o
 * caso em que o controle não cabe num `<FormField>` (um item de lista, cujo
 * "rótulo" é o cabeçalho do próprio item) e o `<span>` de erro é escrito à
 * mão: o `aria-describedby` gerado por `atributosDeCampo` só funciona se o
 * elemento existir com EXATAMENTE este id, então ninguém deve remontá-lo por
 * conta própria.
 */
export function idDeErroDeCampo(id: string): string {
  return `${id}-erro`
}

/**
 * Envelope de um campo de formulário do painel: rótulo, controle, texto de
 * ajuda e mensagem de erro, sempre na mesma ordem e com o mesmo espaçamento.
 *
 * A ligação de acessibilidade fica em `atributosDeCampo` (abaixo) em vez de um
 * `cloneElement` mágico sobre `children`: o controle continua sendo escrito
 * por quem o usa — `<input>`, `<textarea>` ou `<input type="file">`, cada um
 * com os próprios eventos — e só recebe `id`/`aria-invalid`/`aria-describedby`
 * por spread, sem este componente precisar conhecer o tipo do controle.
 */
export function FormField({ id, label, ajuda, erro, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={CLASSE_ROTULO}>
        {label}
      </label>
      {children}
      {ajuda && (
        <span id={idDaAjuda(id)} className={CLASSE_AJUDA}>
          {ajuda}
        </span>
      )}
      {erro && (
        <span id={idDeErroDeCampo(id)} role="alert" className={CLASSE_ERRO_DE_CAMPO}>
          {erro}
        </span>
      )}
    </div>
  )
}

interface AtributosDeCampoOpcoes {
  temAjuda?: boolean
  erro?: string
}

/**
 * Atributos a espalhar no controle de um `<FormField>` com o mesmo `id`:
 * liga o texto de ajuda e a mensagem de erro ao controle
 * (`aria-describedby`) e marca o estado inválido (`aria-invalid`) — o que faz
 * um leitor de tela anunciar o erro junto do campo, em vez de deixá-lo como
 * um texto vermelho solto ao lado.
 */
export function atributosDeCampo(id: string, { temAjuda, erro }: AtributosDeCampoOpcoes = {}) {
  const descricoes = [temAjuda ? idDaAjuda(id) : '', erro ? idDeErroDeCampo(id) : ''].filter(
    (parte) => parte.length > 0,
  )
  return {
    id,
    'aria-invalid': erro ? true : undefined,
    'aria-describedby': descricoes.length > 0 ? descricoes.join(' ') : undefined,
  } as const
}
