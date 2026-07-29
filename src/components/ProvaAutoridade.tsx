import { PROVA_AUTORIDADE } from '../data/content'
import MoleculeTexture from './MoleculeTexture'

const HEADER_OFFSET = 76

function scrollToMaterial() {
  const el = document.getElementById('material-tecnico')
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET
  window.scrollTo({ top, behavior: 'smooth' })
}

export default function ProvaAutoridade() {
  return (
    <section
      id="prova-autoridade"
      className="relative bg-navy py-16 md:py-24 overflow-hidden"
      style={{ scrollMarginTop: 76 }}
    >
      <MoleculeTexture opacity={0.1} className="absolute inset-0 w-full h-full" />
      <div className="relative mx-auto max-w-content px-6 md:px-24">
        <p className="text-gold text-[13px] font-bold tracking-wide mb-4">
          {PROVA_AUTORIDADE.eyebrow}
        </p>
        <h2 className="font-heading text-white font-bold text-2xl md:text-[30px] mb-10 max-w-2xl">
          {PROVA_AUTORIDADE.heading}
        </h2>

        <div className="grid md:grid-cols-3 gap-6 md:gap-10 mb-10 items-stretch">
          {PROVA_AUTORIDADE.stats.map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <p className="font-heading text-gold font-bold text-4xl md:text-5xl mb-3">
                {stat.value}
              </p>
              <p className="text-[#D2D5E4] text-sm leading-relaxed flex-1 mb-4">{stat.label}</p>
              <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mt-auto">
                <div
                  className="h-full bg-gold rounded-full"
                  style={{ width: `${stat.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-[#AEB4C6] text-xs leading-relaxed max-w-2xl mb-8">
          {PROVA_AUTORIDADE.note}
        </p>

        <div className="flex items-center gap-4">
          <img src="/assets/padrao-ouro.png" alt="Selo Padrão Ouro Virbac" className="w-14" />
          <button
            onClick={scrollToMaterial}
            className="bg-gold text-navy font-bold text-sm px-6 py-3.5 rounded-sm hover:brightness-95 transition"
          >
            {PROVA_AUTORIDADE.ctaLabel}
          </button>
        </div>
      </div>
    </section>
  )
}
