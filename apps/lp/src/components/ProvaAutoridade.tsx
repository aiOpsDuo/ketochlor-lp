import { useEffect, useRef, useState } from 'react'
import { usePublishedContent } from '../content/PublishedContentProvider'
import MoleculeTexture from './MoleculeTexture'

const HEADER_OFFSET = 76
const DURATION = 1300 // ms — contador e barra usam a mesma duração

function scrollToMaterial() {
  const el = document.getElementById('material-tecnico')
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET
  window.scrollTo({ top, behavior: 'smooth' })
}

/** easeOutCubic — arranca rápido, desacelera no final */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

/** Dispara uma única vez quando o elemento ref entra 30% no viewport */
function useInView(threshold = 0.3) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { threshold }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold])

  return { ref, visible }
}

interface StatCardProps {
  value: string // ex: "70%"
  label: string
  pct: number
  animate: boolean
  reduced: boolean
}

function StatCard({ value, label, pct, animate, reduced }: StatCardProps) {
  const numeric = parseInt(value.replace('%', ''), 10)

  // ── Contador: controlado por rAF ──────────────────────────────────────────
  const [displayCount, setDisplayCount] = useState(0)
  const rafRef = useRef<number | null>(null)

  // ── Barra: controlada por CSS transition pura ─────────────────────────────
  // barFilled=false → width:0  |  barFilled=true → width: var(--progress)
  const [barFilled, setBarFilled] = useState(false)

  useEffect(() => {
    // Sem animação: exibe valores finais imediatamente
    if (!animate) return
    if (reduced) {
      setDisplayCount(numeric)
      setBarFilled(true)
      return
    }

    // ── Barra via CSS transition ──────────────────────────────────────────
    // Double-rAF garante que o browser pintou width:0 antes de acionar a
    // transição para width:var(--progress). Um único setTimeout não é
    // confiável em todos os browsers.
    let raf1: number, raf2: number
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setBarFilled(true)
      })
    })

    // ── Contador via rAF ──────────────────────────────────────────────────
    let start: number | null = null

    function tick(timestamp: number) {
      if (start === null) start = timestamp
      const elapsed = timestamp - start
      const progress = Math.min(elapsed / DURATION, 1)
      const eased = easeOutCubic(progress)
      setDisplayCount(Math.round(eased * numeric))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setDisplayCount(numeric) // garante valor exato no final
      }
    }

    rafRef.current = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [animate, reduced, numeric])

  return (
    <div className="flex flex-col">
      {/* Número animado via rAF */}
      <p className="font-heading text-gold font-bold text-4xl md:text-5xl mb-3">
        {animate || reduced ? displayCount : 0}%
      </p>
      <p className="text-[#D2D5E4] text-sm leading-relaxed flex-1 mb-4">{label}</p>

      {/* Container da barra — sempre 100% de largura */}
      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden mt-auto">
        {/*
          Preenchimento:
          - Começa em width: 0 (estado inicial, barFilled=false)
          - CSS transition leva até --progress quando barFilled=true
          - transition está SEMPRE presente para que o browser a aplique
            quando a largura muda de 0 → var(--progress)
        */}
        <div
          className="h-full bg-gold rounded-full"
          style={
            {
              '--progress': `${pct}%`,
              width: barFilled ? 'var(--progress)' : '0%',
              transition: reduced ? 'none' : `width ${DURATION}ms cubic-bezier(0.33, 1, 0.68, 1)`,
            } as React.CSSProperties
          }
        />
      </div>
    </div>
  )
}

export default function ProvaAutoridade() {
  const { ref, visible } = useInView(0.3)
  const { sections } = usePublishedContent()
  const provaAutoridade = sections.prova_autoridade

  // Lê prefers-reduced-motion uma vez (não muda durante a sessão)
  const reduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!provaAutoridade) {
    return null
  }

  return (
    <section
      id="prova-autoridade"
      className="relative bg-navy py-16 md:py-24 overflow-hidden"
      style={{ scrollMarginTop: 76 }}
    >
      <MoleculeTexture opacity={0.1} className="absolute inset-0 w-full h-full" />
      <div className="relative mx-auto max-w-content px-6 md:px-24">
        <p className="text-gold text-[13px] font-bold tracking-wide mb-4">
          {provaAutoridade.eyebrow}
        </p>
        <h2 className="font-heading text-white font-bold text-2xl md:text-[30px] mb-10 max-w-2xl">
          {provaAutoridade.heading}
        </h2>

        {/* Container observado pelo IntersectionObserver */}
        <div
          ref={ref}
          className="grid md:grid-cols-3 gap-6 md:gap-10 mb-10 items-stretch"
        >
          {provaAutoridade.stats.map((stat, i) => (
            <StatCard
              key={i}
              value={stat.value}
              label={stat.label}
              pct={stat.pct}
              animate={visible}
              reduced={reduced}
            />
          ))}
        </div>

        <p className="text-[#AEB4C6] text-xs leading-relaxed max-w-2xl mb-8">
          {provaAutoridade.note}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
          <img src={provaAutoridade.selo.url} alt={provaAutoridade.selo.alt} className="w-14" />
          <button
            onClick={scrollToMaterial}
            className="bg-gold text-navy font-bold text-sm px-7 py-4 rounded-sm hover:brightness-95 active:scale-[0.98] transition shadow-md text-center"
          >
            {provaAutoridade.ctaLabel}
          </button>
        </div>
      </div>
    </section>
  )
}
