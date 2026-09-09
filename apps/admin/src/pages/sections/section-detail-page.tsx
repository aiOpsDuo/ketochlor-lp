import { useParams } from 'react-router-dom'

/**
 * Placeholder da tela de edição de uma seção — só prova que a navegação
 * `/sections/:key` funciona de ponta a ponta. O formulário real (campos de
 * texto, listas, upload de imagem) chega na tarefa `painel/formulario-edicao-secao`.
 */
export function SectionDetailPage() {
  const { key } = useParams<{ key: string }>()

  return <p className="text-sm text-gray-500">Edição da seção {key} — em construção.</p>
}
