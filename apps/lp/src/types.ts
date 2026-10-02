export type SectionId =
  | 'inicio'
  | 'problema'
  | 'fenotipos'
  | 'mecanismo'
  | 'tecnologia-sis'
  | 'prova-autoridade'
  | 'protocolo'
  | 'diferenciais'
  | 'material-tecnico'
  | 'contato-comercial'
  | 'faq'

export interface NavItem {
  label: string
  targetId: SectionId
}

/** Item do rodapé institucional. Sem `href`, o item é só texto (não é uma página). */
export interface FooterLink {
  label: string
  href?: string
}

export interface LeadFormData {
  nome: string
  email: string
  telefone: string
  crmv: string
  estadoCidade: string
  especialidade: string
  jaClienteVirbac: boolean
  desejaContatoComercial: boolean
  aceitaLGPD: boolean
}
