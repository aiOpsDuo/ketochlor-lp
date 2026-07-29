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

export interface FaqItem {
  question: string
  answer: string
}

export interface DosageRow {
  peso: string
  volumeMl: string
}
