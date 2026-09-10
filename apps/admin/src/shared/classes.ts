/**
 * Classes base dos controles do painel (campos e botões), em um único lugar.
 *
 * Existe por dois motivos, nenhum deles estético: (1) a mesma cadeia de
 * utilitários era repetida literalmente em seis arquivos, então qualquer
 * ajuste de foco/borda exigia lembrar de todos eles (G5); (2) o estado de erro
 * de um campo precisa SOBREPOR a borda e o anel de foco do estado normal — o
 * que só é confiável se as duas variantes forem escritas lado a lado, na mesma
 * ordem de propriedades.
 *
 * A paleta aqui é a neutra do Tailwind (`slate`), de propósito: no painel a
 * cor de marca é acento (item ativo de navegação, faixa lateral, hover de
 * link), nunca o preenchimento de um botão de ação. Ver `docs/PAINEL.md`.
 *
 * Toda variante `dark:` abaixo usa a MESMA família `slate` do modo claro, só
 * em tons invertidos (texto claro sobre fundo escuro) — é o tema escuro da
 * tarefa `ajustes/tema-escuro-logo-e-campo-de-imagem`, ativado por
 * `darkMode: 'class'` (`tailwind.config.ts`) e pela classe `dark` que
 * `src/theme/theme-context.tsx` alterna em `<html>`.
 */

/**
 * Campo de formulário (input, textarea, select) — tudo o que NÃO depende do
 * estado de validação. Note que nem a cor da borda nem a do anel de foco estão
 * aqui: as duas vêm da variante escolhida em `classeDeCampo`.
 */
const CLASSE_CAMPO_BASE =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm text-navy placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500'

/**
 * Cores de borda/foco por estado de validação. São variantes MUTUAMENTE
 * EXCLUSIVAS, e não um sufixo somado ao estado normal, porque no CSS gerado
 * pelo Tailwind as utilidades de `border-color` saem em ordem alfabética de
 * classe: `.border-red-400` aparece ANTES de `.border-slate-300`, então
 * aplicar as duas no mesmo elemento deixaria a cor neutra vencer e o campo em
 * erro apareceria sem destaque nenhum (regressão detectada em navegador real:
 * a borda ficava `rgb(203 213 225)`). Com uma cor de borda por elemento, não
 * há disputa de especificidade para perder — o mesmo raciocínio vale para o
 * par `dark:border-*` abaixo.
 */
const CLASSE_CAMPO_NORMAL =
  'border-slate-300 focus:border-slate-500 focus:ring-slate-500/30 dark:border-slate-600 dark:focus:border-slate-400 dark:focus:ring-slate-400/30'
const CLASSE_CAMPO_INVALIDO =
  'border-red-400 focus:border-red-500 focus:ring-red-500/30 dark:border-red-500 dark:focus:border-red-400 dark:focus:ring-red-400/30'

/** Classe de um campo, já considerando se ele está em erro. */
export function classeDeCampo(temErro: boolean, extra = ''): string {
  return [CLASSE_CAMPO_BASE, temErro ? CLASSE_CAMPO_INVALIDO : CLASSE_CAMPO_NORMAL, extra]
    .filter((parte) => parte.length > 0)
    .join(' ')
}

/** Rótulo de campo. */
export const CLASSE_ROTULO = 'text-sm font-medium text-navy dark:text-slate-100'

/** Texto de ajuda abaixo de um campo. */
export const CLASSE_AJUDA = 'text-xs text-slate-500 dark:text-slate-400'

/** Mensagem de erro de um campo. */
export const CLASSE_ERRO_DE_CAMPO = 'text-sm text-red-600 dark:text-red-400'

export type VarianteDeBotao = 'primario' | 'secundario' | 'perigo'
export type TamanhoDeBotao = 'medio' | 'pequeno'

const BASE_BOTAO =
  'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500/40 disabled:cursor-not-allowed disabled:opacity-50 dark:focus-visible:ring-slate-400/40'

const VARIANTES_DE_BOTAO: Record<VarianteDeBotao, string> = {
  // Ação principal (salvar) em neutro escuro — não na cor de marca.
  primario: 'bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600',
  secundario:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700',
  // Ação destrutiva: contorno vermelho, nunca preenchimento — a confirmação de
  // dois passos é que carrega o peso da ação, não a saturação do botão.
  perigo:
    'border border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-slate-800 dark:text-red-400 dark:hover:bg-red-950',
}

const TAMANHOS_DE_BOTAO: Record<TamanhoDeBotao, string> = {
  medio: 'px-4 py-2 text-sm',
  pequeno: 'px-2.5 py-1.5 text-xs',
}

export function classeDeBotao(
  variante: VarianteDeBotao,
  tamanho: TamanhoDeBotao = 'medio',
  extra = '',
): string {
  return [BASE_BOTAO, VARIANTES_DE_BOTAO[variante], TAMANHOS_DE_BOTAO[tamanho], extra]
    .filter((parte) => parte.length > 0)
    .join(' ')
}

/** Etiqueta de estado (publicada / não publicada, visível / oculto). */
export function classeDeEtiqueta(ativa: boolean): string {
  const cores = ativa
    ? 'border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-300'
    : 'border-slate-200 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
  return `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cores}`
}
