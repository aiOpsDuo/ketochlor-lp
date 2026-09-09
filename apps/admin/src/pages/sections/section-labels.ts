import type { SectionKey } from '@ketochlor/content-schema'

/**
 * Rótulo em português amigável para cada uma das 11 seções fechadas do CMS
 * (SDD § "Linguagem ubíqua") — a listagem do painel nunca expõe ao operador
 * de conteúdo o identificador técnico cru (ex. `tecnologia_sis`).
 *
 * `Record<SectionKey, string>` é exaustivo por construção: se uma seção for
 * adicionada a `@ketochlor/content-schema` sem um rótulo aqui, o `tsc`
 * (`npm run build`) falha em vez de a listagem exibir uma chave sem nome
 * amigável em produção.
 */
export const SECTION_LABELS: Record<SectionKey, string> = {
  hero: 'Hero',
  problema: 'Problema',
  fenotipos: 'Fenótipos',
  mecanismo: 'Mecanismo',
  tecnologia_sis: 'Tecnologia SIS',
  prova_autoridade: 'Prova de Autoridade',
  protocolo: 'Protocolo',
  diferenciais: 'Diferenciais',
  material_tecnico: 'Material Técnico',
  cta_secundario: 'CTA Secundário',
  faq: 'FAQ',
}
