import { FENOTIPOS } from '../data/content'

export default function Fenotipos() {
  return (
    <section id="fenotipos" className="bg-white py-16 md:py-24" style={{ scrollMarginTop: 76 }}>
      <div className="mx-auto max-w-content px-6 md:px-24">
        <p className="text-blue-institutional text-[13px] font-bold tracking-wide mb-4">
          {FENOTIPOS.eyebrow}
        </p>
        <h2 className="font-heading text-navy font-bold text-2xl md:text-[30px] mb-5 max-w-2xl">
          {FENOTIPOS.heading}
        </h2>
        <p className="text-graytxt text-[15px] leading-relaxed max-w-3xl mb-10">
          {FENOTIPOS.intro}
        </p>

        <div className="grid md:grid-cols-2 gap-6 md:gap-10">
          <div className="rounded-lg border border-cardborder p-7">
            <p className="text-graytxt text-xs font-bold tracking-wide mb-1">
              PACIENTE AGUDO
            </p>
            <p className="font-heading font-bold text-navy text-base mb-4">
              {FENOTIPOS.agudo.subtitle}
            </p>
            <p className="text-graytxt text-sm leading-relaxed">{FENOTIPOS.agudo.body}</p>
          </div>

          <div className="relative rounded-lg border-2 border-blue-institutional p-7">
            <span className="absolute top-5 right-5 bg-blue-institutional text-white text-[11px] font-bold px-3 py-1 rounded-full">
              {FENOTIPOS.cronico.badge}
            </span>
            <p className="text-blue-institutional text-xs font-bold tracking-wide mb-1">
              PACIENTE CRÔNICO
            </p>
            <p className="font-heading font-bold text-navy text-base mb-4">
              {FENOTIPOS.cronico.subtitle}
            </p>
            <p className="text-graytxt text-sm leading-relaxed">{FENOTIPOS.cronico.body}</p>
          </div>
        </div>

        <p className="text-navy text-[15px] leading-relaxed mt-10 max-w-3xl">
          {FENOTIPOS.closing}
        </p>
      </div>
    </section>
  )
}
