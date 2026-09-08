import { CTA_SECUNDARIO } from '../data/content'

export default function CTASecundario() {
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
              {CTA_SECUNDARIO.heading}
            </p>
            <p className="text-graytxt text-sm">{CTA_SECUNDARIO.body}</p>
          </div>
          <a
            href="#material-tecnico"
            className="shrink-0 inline-flex justify-center border-2 border-blue-institutional text-blue-institutional font-bold text-sm px-6 py-3 rounded-sm hover:bg-blue-institutional hover:text-white transition"
          >
            {CTA_SECUNDARIO.ctaLabel}
          </a>
        </div>
      </div>
    </section>
  )
}
