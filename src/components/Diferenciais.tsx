import { DIFERENCIAIS } from '../data/content'

export default function Diferenciais() {
  return (
    <section id="diferenciais" className="bg-lighttint py-16 md:py-24" style={{ scrollMarginTop: 76 }}>
      <div className="mx-auto max-w-content px-6 md:px-24">
        <p className="text-blue-institutional text-[13px] font-bold tracking-wide mb-4">
          {DIFERENCIAIS.eyebrow}
        </p>
        <h2 className="font-heading text-navy font-bold text-2xl md:text-[30px] mb-10">
          {DIFERENCIAIS.heading}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {DIFERENCIAIS.items.map((item) => (
            <div key={item.titulo} className="bg-white rounded-lg border border-cardborder p-6">
              <span className="block w-2 h-2 rounded-full bg-gold mb-4" />
              <p className="font-heading font-bold text-navy text-[15px] mb-3">{item.titulo}</p>
              <p className="text-graytxt text-sm leading-relaxed">{item.corpo}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
