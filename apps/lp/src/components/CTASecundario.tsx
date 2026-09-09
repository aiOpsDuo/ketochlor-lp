import { usePublishedContent } from '../content/PublishedContentProvider'

export default function CTASecundario() {
  const { sections } = usePublishedContent()
  const ctaSecundario = sections.cta_secundario

  if (!ctaSecundario) {
    return null
  }

  return (
    <section
      id="contato-comercial"
      className="bg-lighttint py-8 md:py-10"
      style={{ scrollMarginTop: 76 }}
    >
      <div className="mx-auto max-w-content px-6 md:px-24">
        <div className="bg-white rounded-lg border border-cardborder p-6 md:p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="font-heading font-bold text-navy text-base mb-1">
              {ctaSecundario.heading}
            </p>
            <p className="text-graytxt text-sm">{ctaSecundario.body}</p>
          </div>
          <a
            href="#material-tecnico"
            className="shrink-0 inline-flex justify-center border-2 border-blue-institutional text-blue-institutional font-bold text-sm px-6 py-3 rounded-sm hover:bg-blue-institutional hover:text-white transition"
          >
            {ctaSecundario.ctaLabel}
          </a>
        </div>
      </div>
    </section>
  )
}
