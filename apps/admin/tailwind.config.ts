import { cores } from '@ketochlor/design-tokens'
import type { Config } from 'tailwindcss'

/**
 * O painel compartilha com a LP apenas a PALETA DE COR da marca, via
 * `@ketochlor/design-tokens` — nunca a tipografia nem a densidade visual (ver
 * `docs/PAINEL.md`). As cores entram por `theme.extend.colors`, e não
 * substituindo `theme`, para que a paleta padrão do Tailwind (`slate`, `red`,
 * `green`, ...) continue disponível: ela é a base de toda a UI utilitária do
 * painel, com a cor de marca reservada ao acento (item ativo de navegação,
 * hover de link, faixa lateral).
 *
 * Nomes de grupo iguais aos já usados em `apps/lp/tailwind.config.ts`
 * (`navy`, `gold`, `blue.institutional`, `graytxt`, `lighttint`,
 * `cardborder`) — a mesma cor tem o mesmo nome nas duas aplicações, então uma
 * classe como `text-navy` significa exatamente a mesma coisa dos dois lados.
 *
 * Sem `darkMode`: o painel não tem alternador de tema (ver `docs/PAINEL.md`).
 * Declarar `darkMode: 'class'` sem nenhuma variante `dark:` escrita não muda
 * nada e só sugere um recurso que não existe.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: cores,
    },
  },
  plugins: [],
} satisfies Config
