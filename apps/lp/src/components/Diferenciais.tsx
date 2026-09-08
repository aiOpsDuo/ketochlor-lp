import { DIFERENCIAIS } from '../data/content'

const HEADER_OFFSET = 76

function scrollToMaterial() {
  const el = document.getElementById('material-tecnico')
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET
  window.scrollTo({ top, behavior: 'smooth' })
}

export default function Diferenciais() {
  return (
    <section id="diferenciais" className="bg-lighttint py-16 md:py-24" style={{ scrollMarginTop: 76 }}>
      <div className="mx-auto max-w-content px-6 md:px-24">
        {/* Cabeçalho centralizado padronizado */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
          <p className="text-blue-institutional text-[13px] font-bold tracking-wide mb-4">
            {DIFERENCIAIS.eyebrow}
          </p>
          <h2 className="font-heading text-navy font-bold text-2xl md:text-[30px]">
            {DIFERENCIAIS.heading}
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 items-stretch mb-10">
          {DIFERENCIAIS.items.map((item) => (
            <div
              key={item.titulo}
              className={[
                'group bg-white rounded-lg border border-cardborder p-6',
                'flex flex-col',
                'transition-[background-color,border-color,box-shadow,transform] duration-[250ms] ease-out',
                'hover:bg-[#EEF2FA] hover:-translate-y-1',
                'hover:shadow-[0_8px_28px_0_rgba(20,42,82,0.11)] hover:border-[#26468A]/25',
                'active:scale-[0.98]',
                'motion-reduce:transition-none motion-reduce:hover:translate-y-0 motion-reduce:hover:shadow-none',
              ].join(' ')}
            >
              <span
                className={[
                  'block w-2 h-2 rounded-full bg-gold mb-4',
                  'transition-transform duration-[250ms] ease-out',
                  'group-hover:scale-125',
                  'motion-reduce:transition-none motion-reduce:group-hover:scale-100',
                ].join(' ')}
              />
              <p className="font-heading font-bold text-navy text-[15px] mb-3">
                {item.titulo}
              </p>
              <p className="text-graytxt text-sm leading-relaxed flex-1">{item.corpo}</p>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-10">
          <button
            onClick={scrollToMaterial}
            className="inline-block bg-gold text-navy font-bold text-sm px-7 py-4 rounded-sm hover:brightness-95 active:scale-[0.98] transition shadow-md text-center"
          >
            Conhecer o protocolo de uso
          </button>
        </div>
      </div>
    </section>
  )
}
