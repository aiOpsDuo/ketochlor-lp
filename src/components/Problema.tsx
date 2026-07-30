import { PROBLEMA } from '../data/content'
import MoleculeTexture from './MoleculeTexture'

const HEADER_OFFSET = 76

function scrollToMaterial() {
  const el = document.getElementById('material-tecnico')
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET
  window.scrollTo({ top, behavior: 'smooth' })
}

export default function Problema() {
  return (
    <section
      id="problema"
      className="relative bg-navy py-16 md:py-24 overflow-hidden"
      style={{ scrollMarginTop: 76 }}
    >
      <MoleculeTexture opacity={0.1} className="absolute inset-0 w-full h-full" />
      <div className="relative mx-auto max-w-content px-6 md:px-24">
        {/* Cabeçalho centralizado padronizado */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
          <p className="text-gold text-[13px] font-bold tracking-wide mb-4">
            {PROBLEMA.eyebrow}
          </p>
          <h2 className="font-heading text-white font-bold text-2xl md:text-[30px]">
            {PROBLEMA.heading}
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="space-y-4 mb-8">
              {PROBLEMA.paragraphs.map((p, i) => (
                <p key={i} className="text-[#D2D5E4] text-[15px] leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
            <button
              onClick={scrollToMaterial}
              className="inline-block bg-gold text-navy font-bold text-sm px-7 py-4 rounded-sm hover:brightness-95 active:scale-[0.98] transition shadow-md"
            >
              Saiba como controlar a dermatite
            </button>
          </div>
          <div className="relative flex justify-center">
            <div className="absolute inset-6 rounded-full bg-white/5" aria-hidden />
            <img
              src="/assets/cachorro-cocando2.jpg"
              alt="Cão apresentando prurido, sinal clínico de infecção secundária associada à DAC"
              className="relative w-full max-w-md aspect-square object-cover rounded-full shadow-xl"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
