import { useEffect, useState } from 'react'
import { NAV_ITEMS } from '../data/content'
import type { SectionId } from '../types'

const HEADER_HEIGHT = 76 // px, must match h-[76px] below

function scrollToSection(id: SectionId) {
  const el = document.getElementById(id)
  if (!el) return
  const top = el.getBoundingClientRect().top + window.scrollY - HEADER_HEIGHT
  window.scrollTo({ top, behavior: 'smooth' })
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeSection, setActiveSection] = useState<SectionId>('inicio')

  useEffect(() => {
    const ids = ['inicio', ...NAV_ITEMS.map((n) => n.targetId)]
    const unique = Array.from(new Set(ids))

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id as SectionId)
          }
        })
      },
      { rootMargin: `-${HEADER_HEIGHT + 40}px 0px -60% 0px`, threshold: 0 },
    )

    unique.forEach((id) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })

    return () => observer.disconnect()
  }, [])

  const handleNavClick = (targetId: SectionId) => {
    setMenuOpen(false)
    scrollToSection(targetId)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-[76px] bg-white shadow-[0_2px_10px_rgba(15,20,30,0.06)]">
      <div className="mx-auto max-w-content h-full flex items-center justify-between px-6 md:px-24">
        <button
          onClick={() => handleNavClick('inicio')}
          className="flex items-center shrink-0"
          aria-label="Ketochlor — voltar ao início"
        >
          <img
            src="/assets/logo-ketochlor-transp.png"
            alt="Ketochlor®"
            className="h-10 md:h-14 w-auto"
          />
        </button>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-8">
          {NAV_ITEMS.map((item) => {
            const isActive = activeSection === item.targetId
            return (
              <button
                key={item.targetId}
                onClick={() => handleNavClick(item.targetId)}
                className={`text-[13px] pb-1 border-b-2 transition-colors ${
                  isActive
                    ? 'text-navy font-bold border-gold'
                    : 'text-graytxt font-normal border-transparent hover:text-navy'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </nav>

        <button
          onClick={() => handleNavClick('material-tecnico')}
          className="hidden lg:inline-flex items-center bg-gold text-navy text-xs font-bold px-5 py-3 rounded-sm hover:brightness-95 transition"
        >
          ACESSAR MATERIAL TÉCNICO
        </button>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden flex flex-col justify-center gap-[6px] w-8 h-8"
          aria-label="Abrir menu"
          onClick={() => setMenuOpen(true)}
        >
          <span className="block h-[2px] w-6 bg-navy" />
          <span className="block h-[2px] w-6 bg-navy" />
          <span className="block h-[2px] w-6 bg-navy" />
        </button>
      </div>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-white">
          <div className="flex items-center justify-between px-5 h-[64px] border-b border-cardborder">
            <img src="/assets/logo-ketochlor-transp.png" alt="Ketochlor®" className="h-8 w-auto" />
            <button aria-label="Fechar menu" onClick={() => setMenuOpen(false)} className="w-6 h-6 relative">
              <span className="absolute inset-0 rotate-45 top-1/2 h-[2px] bg-navy" />
              <span className="absolute inset-0 -rotate-45 top-1/2 h-[2px] bg-navy" />
            </button>
          </div>
          <nav className="flex flex-col px-5">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.targetId
              return (
                <button
                  key={item.targetId}
                  onClick={() => handleNavClick(item.targetId)}
                  className={`text-left py-4 border-b border-cardborder text-base ${
                    isActive ? 'text-navy font-bold' : 'text-[#464E5C]'
                  }`}
                >
                  {item.label}
                  {isActive && <span className="block w-8 h-[2px] bg-gold mt-1" />}
                </button>
              )
            })}
            <button
              onClick={() => handleNavClick('material-tecnico')}
              className="mt-5 mb-8 bg-gold text-navy font-bold text-sm py-3 rounded-sm"
            >
              ACESSAR MATERIAL
            </button>
          </nav>
        </div>
      )}
    </header>
  )
}
