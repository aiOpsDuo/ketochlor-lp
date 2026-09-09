import { usePublishedContent } from '../content/PublishedContentProvider'

export default function TecnologiaSIS() {
  const { sections } = usePublishedContent()
  const tecnologiaSis = sections.tecnologia_sis

  if (!tecnologiaSis) {
    return null
  }

  return (
    <section id="tecnologia-sis" className="bg-white py-16 md:py-24" style={{ scrollMarginTop: 76 }}>
      <div className="mx-auto max-w-content px-6 md:px-24">
        {/* Cabeçalho centralizado padronizado */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
          <p className="text-blue-institutional text-[13px] font-bold tracking-wide mb-4">
            {tecnologiaSis.eyebrow}
          </p>
          <h2 className="font-heading text-navy font-bold text-2xl md:text-[30px] mb-5">
            {tecnologiaSis.heading}
          </h2>
          <p className="text-graytxt text-[15px] leading-relaxed">
            {tecnologiaSis.body}
          </p>
        </div>

        <div className="relative flex justify-center">
          <div className="absolute inset-8 rounded-full bg-lighttint" aria-hidden />
          <img
            src={tecnologiaSis.imagem.url}
            alt={tecnologiaSis.imagem.alt}
            className="relative w-full max-w-md rounded-2xl shadow-xl"
          />
        </div>
      </div>
    </section>
  )
}
