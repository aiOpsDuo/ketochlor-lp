import { FENOTIPOS } from '../data/content'

const HEADER_OFFSET = 76

function scrollToMaterial() {
  const el = document.getElementById('material-tecnico')
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET
  window.scrollTo({ top, behavior: 'smooth' })
}

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

        <div className="grid md:grid-cols-2 gap-6 md:gap-10 items-stretch">

          {/* ── Card: Paciente Agudo ─────────────────────────────────────────── */}
          <div
            className={[
              'group rounded-lg border border-cardborder p-7',
              'flex flex-col bg-white',
              'transition-[background-color,border-color,box-shadow,transform] duration-[250ms] ease-out',
              'hover:bg-gold hover:border-navy/20 hover:-translate-y-1',
              'hover:shadow-[0_8px_32px_0_rgba(20,42,82,0.18)]',
              'active:scale-[0.98]',
              'motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none',
            ].join(' ')}
          >
            <p className="text-graytxt text-xs font-bold tracking-wide mb-1 transition-colors duration-[250ms] group-hover:text-navy motion-reduce:transition-none">
              PACIENTE AGUDO
            </p>
            <p className="font-heading font-bold text-navy text-base mb-4">
              {FENOTIPOS.agudo.subtitle}
            </p>
            <p className="text-graytxt text-sm leading-relaxed flex-1 transition-colors duration-[250ms] group-hover:text-navy motion-reduce:transition-none">
              {FENOTIPOS.agudo.body}
            </p>
          </div>

          {/* ── Card: Paciente Crônico ───────────────────────────────────────── */}
          <div
            className={[
              'group relative rounded-lg border-2 border-blue-institutional p-7',
              'flex flex-col bg-white',
              'transition-[background-color,border-color,box-shadow,transform] duration-[250ms] ease-out',
              'hover:bg-gold hover:border-navy/30 hover:-translate-y-1',
              'hover:shadow-[0_8px_32px_0_rgba(20,42,82,0.18)]',
              'active:scale-[0.98]',
              'motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-5 right-5 text-[11px] font-bold px-3 py-1 rounded-full',
                'bg-blue-institutional text-white',
                'transition-[background-color,color,transform] duration-[250ms] ease-out',
                'group-hover:bg-navy group-hover:text-white group-hover:scale-105',
                'active:scale-100',
                'motion-reduce:transition-none motion-reduce:group-hover:scale-100',
              ].join(' ')}
            >
              {FENOTIPOS.cronico.badge}
            </span>

            <p className="text-blue-institutional text-xs font-bold tracking-wide mb-1 transition-colors duration-[250ms] group-hover:text-navy motion-reduce:transition-none">
              PACIENTE CRÔNICO
            </p>
            <p className="font-heading font-bold text-navy text-base mb-4">
              {FENOTIPOS.cronico.subtitle}
            </p>
            <p className="text-graytxt text-sm leading-relaxed flex-1 transition-colors duration-[250ms] group-hover:text-navy motion-reduce:transition-none">
              {FENOTIPOS.cronico.body}
            </p>
          </div>

        </div>

        <p className="text-navy text-[15px] leading-relaxed mt-10 max-w-3xl mb-8">
          {FENOTIPOS.closing}
        </p>

        <div className="flex justify-center mt-10">
          <button
            onClick={scrollToMaterial}
            className="inline-block bg-gold text-navy font-bold text-sm px-7 py-4 rounded-sm hover:brightness-95 active:scale-[0.98] transition shadow-md text-center"
          >
            Quero conhecer Ketochlor®
          </button>
        </div>
      </div>
    </section>
  )
}
