import { PROBLEMA } from '../data/content'

export default function Problema() {
  return (
    <section id="problema" className="bg-white py-16 md:py-24" style={{ scrollMarginTop: 76 }}>
      <div className="mx-auto max-w-content px-6 md:px-24 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <p className="text-blue-institutional text-[13px] font-bold tracking-wide mb-4">
            {PROBLEMA.eyebrow}
          </p>
          <h2 className="font-heading text-navy font-bold text-2xl md:text-[30px] mb-5">
            {PROBLEMA.heading}
          </h2>
          <div className="space-y-4">
            {PROBLEMA.paragraphs.map((p, i) => (
              <p key={i} className="text-graytxt text-[15px] leading-relaxed">
                {p}
              </p>
            ))}
          </div>
        </div>
        <div className="relative flex justify-center">
          <div className="absolute inset-6 rounded-full bg-lighttint" aria-hidden />
          <img
            src="/assets/cachorro-cocando2.jpg"
            alt="Cão apresentando prurido, sinal clínico de infecção secundária associada à DAC"
            className="relative w-full max-w-md aspect-square object-cover rounded-full shadow-xl"
          />
        </div>
      </div>
    </section>
  )
}
