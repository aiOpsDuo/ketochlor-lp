/**
 * `@ketochlor/design-tokens` — tokens de design compartilhados do Ketochlor.
 *
 * Pacote SEM passo de build de propósito (`main`/`exports` apontam direto para
 * `src/index.ts`, TypeScript puro, nenhum script `build`): o único consumidor
 * é o `tailwind.config.ts` de cada aplicação, carregado pelo loader do próprio
 * Tailwind, que transpila TS on-the-fly — inclusive de `node_modules` (onde o
 * workspace fica linkado). Um `tsc` aqui só adicionaria um artefato a manter
 * e mais um passo capaz de faltar no Dockerfile.
 */
export { cores } from './colors'
