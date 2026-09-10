/**
 * Paleta de marca do Ketochlor — fonte compartilhada de cor entre a landing
 * page (`apps/lp`) e o painel administrativo (`apps/admin`).
 *
 * Cada aplicação injeta estas cores no próprio `tailwind.config.ts` via
 * `theme.extend.colors` (nunca substituindo `theme` inteiro): a paleta padrão
 * do Tailwind — `slate`, `red`, `green` etc. — continua disponível e é a base
 * de toda a UI neutra/utilitária do painel, com a cor de marca reservada ao
 * acento.
 *
 * **Escopo deliberado:** só COR. Tipografia não entra aqui — a LP usa as
 * fontes de marca (Sora/Inter) e o painel usa a fonte de sistema
 * (`font-sans`), uma decisão de design registrada em `docs/PAINEL.md`, não um
 * descuido. Densidade visual e espaçamento também são de cada aplicação.
 *
 * **Nota sobre `apps/lp`:** a LP mantém, por ora, a própria cópia literal
 * destes valores em `apps/lp/tailwind.config.ts`. Passar a LP a consumir
 * daqui está fora do escopo da tarefa `ajustes/estiliza-painel-admin`
 * (`agent_context/PLAN.md`) — mudar o config da LP arriscaria a aparência de
 * uma página já em produção sem nenhum ganho para o painel. Ao alterar uma
 * cor, altere nos dois lugares até essa unificação acontecer.
 */
export const cores = {
  /** Texto/heading principal e cor "âncora" da marca. */
  navy: '#142A52',
  /** Destaque/CTA da landing page. */
  gold: '#F0BA40',
  /** Azul institucional — acento (eyebrows, links, item ativo de navegação). */
  blue: {
    institutional: '#26468A',
  },
  /** Texto secundário. */
  graytxt: '#646C78',
  /** Fundo claro de página/área. */
  lighttint: '#F7F9FC',
  /** Borda sutil de cartão. */
  cardborder: '#E6E8EC',
} as const
