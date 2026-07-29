import { REFERENCIAS, FOOTER_LINKS } from '../data/content'
import MoleculeTexture from './MoleculeTexture'

export default function Footer() {
  return (
    <footer className="relative bg-navy pt-16 pb-8 overflow-hidden">
      <MoleculeTexture opacity={0.08} className="absolute inset-0 w-full h-full" />
      <div className="relative mx-auto max-w-content px-6 md:px-24">
        <img src="/assets/logo-ketochlor-transp.png" alt="Ketochlor®" className="h-8 mb-10" />

        <div className="grid md:grid-cols-2 gap-10 mb-10">
          <div>
            <p className="text-gold text-xs font-bold tracking-wide mb-4">REFERÊNCIAS</p>
            <ul className="space-y-2">
              {REFERENCIAS.map((ref) => (
                <li key={ref} className="text-[#BEC5D4] text-[11px] leading-relaxed">
                  {ref}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="text-gold text-xs font-bold tracking-wide mb-4">INSTITUCIONAL</p>
            <ul className="space-y-3">
              {FOOTER_LINKS.map((link) => (
                <li key={link}>
                  <a href="#" className="text-[#D2D8E4] text-sm hover:text-white transition">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-6">
          <p className="text-[#969CAD] text-xs">© Virbac. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  )
}
