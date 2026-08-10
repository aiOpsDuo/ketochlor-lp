import { PROTOCOLO, DOSAGEM } from "../data/content";

export default function Protocolo() {
  return (
    <section
      id="protocolo"
      className="bg-white py-16 md:py-24"
      style={{ scrollMarginTop: 76 }}
    >
      <div className="mx-auto max-w-content px-6 md:px-24 grid lg:grid-cols-2 gap-12">
        <div>
          <p className="text-blue-institutional text-[13px] font-bold tracking-wide mb-4">
            {PROTOCOLO.eyebrow}
          </p>
          <h2 className="font-heading text-navy font-bold text-2xl md:text-[30px] mb-5">
            {PROTOCOLO.heading}
          </h2>
          <p className="text-graytxt text-[15px] leading-relaxed mb-6">
            {PROTOCOLO.modoUso}
          </p>
          <span className="inline-block bg-blue-institutional text-white text-[11px] font-bold px-4 py-2 rounded-full mb-6">
            {PROTOCOLO.estabilidadeBadge}
          </span>
          <div className="mt-7 max-w-xl">
            <div className="mb-4">
              <p className="font-heading text-navy text-[14px] md:text-[15px] font-bold uppercase tracking-[0.12em]">
                {PROTOCOLO.closing.product} {PROTOCOLO.closing.highlight}
              </p>

              <div className="mt-2 h-[2px] w-10 bg-gold rounded-full" />
            </div>

            <p className="text-graytxt text-[15px] leading-[1.7]">
              {PROTOCOLO.closing.text}
            </p>
          </div>
        </div>

        <div className="rounded-lg bg-lighttint border border-cardborder p-6 md:p-7 h-fit">
          <div className="flex justify-between text-graytxt text-xs font-bold tracking-wide mb-4">
            <span>PESO DO ANIMAL (KG)</span>
            <span>VOLUME (ML)</span>
          </div>
          <div className="divide-y divide-cardborder">
            {DOSAGEM.map((row) => (
              <div
                key={row.peso}
                className="flex justify-between py-3 text-sm text-navy"
              >
                <span>{row.peso}</span>
                <span>{row.volumeMl}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
