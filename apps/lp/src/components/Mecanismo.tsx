import { usePublishedContent } from '../content/PublishedContentProvider'

export default function Mecanismo() {
  const { sections } = usePublishedContent()
  const mecanismo = sections.mecanismo

  if (!mecanismo) {
    return null
  }

  const colunas = [mecanismo.cetoconazol, mecanismo.clorexidina]

  return (
    <section id="mecanismo" className="bg-lighttint py-16 md:py-24" style={{ scrollMarginTop: 76 }}>
      <div className="mx-auto max-w-content px-6 md:px-24">
        {/* Cabeçalho centralizado padronizado */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
          <p className="text-blue-institutional text-[13px] font-bold tracking-wide mb-4">
            {mecanismo.eyebrow}
          </p>
          <h2 className="font-heading text-navy font-bold text-2xl md:text-[30px] mb-5">
            {mecanismo.heading}
          </h2>
          <p className="text-graytxt text-[15px] leading-relaxed">
            {mecanismo.intro}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 md:gap-10">
          {colunas.map((col) => (
            <div key={col.titulo} className="bg-white rounded-lg border border-cardborder p-7">
              <p className="font-heading font-bold text-blue-institutional text-lg mb-1">
                {col.titulo}
              </p>
              <p className="font-bold text-navy text-sm mb-4">{col.subtitulo}</p>
              <p className="text-graytxt text-sm leading-relaxed">{col.corpo}</p>
            </div>
          ))}
        </div>

        <p className="font-heading font-bold text-navy text-base mt-10 text-center">{mecanismo.closing}</p>
      </div>
    </section>
  )
}
