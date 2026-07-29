import { HERO } from "../data/content";
import MoleculeTexture from "./MoleculeTexture";

const HEADER_OFFSET = 76;

function scrollToMaterial() {
  const el = document.getElementById("material-tecnico");
  if (!el) return;
  const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET;
  window.scrollTo({ top, behavior: "smooth" });
}

export default function Hero() {
  return (
    <section
      id="inicio"
      className="relative overflow-hidden bg-white pt-[76px]"
      style={{ scrollMarginTop: HEADER_OFFSET }}
    >
      {/* Desktop diagonal panel */}
      <div className="hidden lg:block absolute inset-y-0 right-0 w-[54%]">
        <div
          className="absolute inset-0 bg-gradient-to-br from-blue-institutional to-navy"
          style={{ clipPath: "polygon(12% 0, 100% 0, 100% 100%, 0% 100%)" }}
        >
          <MoleculeTexture
            opacity={0.14}
            className="absolute inset-0 w-full h-full"
          />
        </div>
        <div
          className="absolute inset-y-0 w-[3px] bg-gold"
          style={{ left: "12%", transform: "skewX(-8deg)" }}
        />
      </div>

      <div className="relative mx-auto max-w-content px-6 md:px-24 grid lg:grid-cols-2 gap-10 lg:gap-16 py-10 lg:py-20">
        <div className="relative z-10 flex flex-col justify-center">
          <img
            src="/assets/logo-ketochlor-transp.png"
            alt="Ketochlor®"
            className="h-16 w-auto self-start mb-10"
          />
          <p className="text-blue-institutional text-[13px] font-bold tracking-wide mb-4">
            {HERO.eyebrow}
          </p>
          <h1 className="font-heading text-navy font-bold text-[30px] leading-tight md:text-[46px] mb-5 max-w-xl">
            {HERO.heading}
          </h1>
          <p className="text-graytxt text-[15px] md:text-base leading-relaxed max-w-md mb-8">
            {HERO.subheading}
          </p>
          <button
            onClick={scrollToMaterial}
            className="self-start bg-gold text-navy font-bold text-sm px-7 py-4 rounded-sm hover:brightness-95 transition"
          >
            {HERO.ctaLabel}
          </button>
        </div>

        <div className="relative z-10 flex items-center justify-center lg:justify-end">
          <div className="relative">
            <div
              className="absolute -inset-6 rounded-full bg-black/10 blur-2xl"
              aria-hidden
            />
            <img
              src="/assets/produtos.png"
              alt="Linha Ketochlor® — shampoos terapêuticos Virbac"
              className="relative w-full max-w-sm lg:max-w-md rounded-lg shadow-2xl"
            />
            <img
              src="/assets/padrao-ouro.png"
              alt="Selo Padrão Ouro Virbac"
              className="absolute -top-6 -right-4 w-24 md:w-28 drop-shadow-lg"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
