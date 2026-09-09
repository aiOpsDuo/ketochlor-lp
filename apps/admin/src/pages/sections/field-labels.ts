/**
 * Rótulo em português amigável para cada chave de campo que aparece dentro
 * de alguma das 11 seções (topo, item de lista ou subestrutura fixa) — PRD
 * § Fluxo de UX/notas de design: "Rótulos usam a linguagem de quem escreve o
 * conteúdo, não os nomes técnicos dos campos do código." Mesmo espírito de
 * `section-labels.ts` (`SECTION_LABELS`), mas por chave de CAMPO em vez de
 * chave de seção — uma chave como `titulo`/`corpo` se repete em mais de uma
 * seção com o mesmo sentido, por isso um dicionário único cobre as 11 sem
 * repetir rótulo por seção.
 *
 * Sem o mesmo tipo `Record<Chave, string>` exaustivo de `SECTION_LABELS`
 * porque as chaves de campo não são um conjunto fechado do mesmo jeito que as
 * 11 seções são (`content-schema/definir-schemas-secoes` pode crescer um
 * campo novo sem esta lista saber de antemão) — por isso `rotuloDoCampo`
 * cai para uma versão "humanizada" da própria chave quando não encontra
 * entrada aqui, em vez de o `tsc` falhar ou a tela quebrar.
 */
const FIELD_LABELS: Record<string, string> = {
  eyebrow: 'Etiqueta (eyebrow)',
  heading: 'Título principal',
  subheading: 'Subtítulo',
  ctaLabel: 'Texto do botão (CTA)',
  paragraphs: 'Parágrafos',
  imagem: 'Imagem',
  imagemCampanha: 'Imagem de campanha',
  imagemCapa: 'Imagem de capa',
  logo: 'Logo',
  selo: 'Selo',
  intro: 'Texto de introdução',
  agudo: 'Fenótipo agudo',
  cronico: 'Fenótipo crônico',
  closing: 'Texto de fechamento',
  title: 'Título',
  subtitle: 'Subtítulo',
  body: 'Texto',
  badge: 'Badge',
  cetoconazol: 'Coluna — Cetoconazol',
  clorexidina: 'Coluna — Clorexidina',
  titulo: 'Título',
  subtitulo: 'Subtítulo',
  corpo: 'Texto',
  stats: 'Estatísticas',
  note: 'Nota de rodapé',
  modoUso: 'Modo de uso',
  estabilidadeBadge: 'Selo de estabilidade',
  dosagem: 'Tabela de dosagem',
  peso: 'Faixa de peso',
  volumeMl: 'Volume (mL)',
  items: 'Itens comparativos',
  product: 'Produto',
  highlight: 'Destaque',
  text: 'Texto',
  legal: 'Texto legal',
  perguntas: 'Perguntas',
  question: 'Pergunta',
  answer: 'Resposta',
  value: 'Valor exibido (ex.: "70%")',
  label: 'Legenda',
  pct: 'Percentual (0 a 100, para a barra visual)',
  url: 'URL da imagem',
  alt: 'Texto alternativo (alt)',
}

/** Converte `camelCase`/`snake_case` numa forma legível, para uma chave sem rótulo cadastrado. */
function humanizar(chave: string): string {
  const comEspacos = chave
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase()
  return comEspacos.charAt(0).toUpperCase() + comEspacos.slice(1)
}

export function rotuloDoCampo(chave: string): string {
  return FIELD_LABELS[chave] ?? humanizar(chave)
}
