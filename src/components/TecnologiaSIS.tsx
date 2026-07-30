import { TECNOLOGIA_SIS } from '../data/content'

export default function TecnologiaSIS() {
  return (
    <section id="tecnologia-sis" className="bg-white py-16 md:py-24" style={{ scrollMarginTop: 76 }}>
      <div className="mx-auto max-w-content px-6 md:px-24">
        {/* Cabeçalho centralizado padronizado */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
          <p className="text-blue-institutional text-[13px] font-bold tracking-wide mb-4">
            {TECNOLOGIA_SIS.eyebrow}
          </p>
          <h2 className="font-heading text-navy font-bold text-2xl md:text-[30px] mb-5">
            {TECNOLOGIA_SIS.heading}
          </h2>
          <p className="text-graytxt text-[15px] leading-relaxed">
            {TECNOLOGIA_SIS.body}
          </p>
        </div>

        <div className="relative flex justify-center">
          <div className="absolute inset-8 rounded-full bg-lighttint" aria-hidden />
          <img
            src="/assets/anatomia-da-pele.png"
            alt="Ilustração técnica das camadas da pele e folículo piloso"
            className="relative w-full max-w-md rounded-2xl shadow-xl"
          />
        </div>
      </div>
    </section>
  )
}
