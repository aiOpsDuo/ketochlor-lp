import { useState } from 'react'
import { usePublishedContent } from '../content/PublishedContentProvider'

export default function FAQ() {
  const { sections } = usePublishedContent()
  const faq = sections.faq
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  if (!faq) {
    return null
  }

  return (
    <section id="faq" className="bg-white py-16 md:py-24" style={{ scrollMarginTop: 76 }}>
      <div className="mx-auto max-w-content px-6 md:px-24">
        {/* Cabeçalho centralizado padronizado */}
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-12">
          <p className="text-blue-institutional text-[13px] font-bold tracking-wide mb-4">
            {faq.eyebrow}
          </p>
          <h2 className="font-heading text-navy font-bold text-2xl md:text-[30px]">
            {faq.heading}
          </h2>
        </div>

        <div className="space-y-4">
          {faq.perguntas.map((pergunta, i) => {
            const isOpen = openIndex === i
            return (
              <div key={i} className="rounded-lg border border-cardborder overflow-hidden">
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 text-left px-6 py-5"
                >
                  <span className="font-heading font-bold text-navy text-[15px]">
                    {pergunta.question}
                  </span>
                  <span
                    className={`shrink-0 w-6 h-6 rounded-full border border-graytxt flex items-center justify-center text-graytxt text-lg leading-none transition-transform duration-300 ease-in-out ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  >
                    {isOpen ? '–' : '+'}
                  </span>
                </button>

                {/* Grid-based height animation: 0fr -> 1fr transitions smoothly without
                    needing to measure content height in JS, and adapts to any text length. */}
                <div
                  className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <p
                      className={`px-6 pb-5 text-graytxt text-sm leading-relaxed transition-opacity duration-300 ease-in-out ${
                        isOpen ? 'opacity-100 delay-100' : 'opacity-0'
                      }`}
                    >
                      {pergunta.answer}
                    </p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
