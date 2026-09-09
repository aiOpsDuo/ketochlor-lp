import { useState } from "react";
import type { FormEvent } from "react";
import { usePublishedContent } from "../content/PublishedContentProvider";
import type { LeadFormData } from "../types";

const INITIAL_STATE: LeadFormData = {
  nome: "",
  email: "",
  telefone: "",
  crmv: "",
  estadoCidade: "",
  especialidade: "",
  jaClienteVirbac: false,
  desejaContatoComercial: false,
  aceitaLGPD: false,
};

export default function FormularioCTA() {
  const { sections } = usePublishedContent();
  const materialTecnico = sections.material_tecnico;
  const [form, setForm] = useState<LeadFormData>(INITIAL_STATE);
  const [submitted, setSubmitted] = useState(false);

  const update = <K extends keyof LeadFormData>(
    key: K,
    value: LeadFormData[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.aceitaLGPD) return;
    // TODO: integração com Salesforce Marketing Cloud — fluxo de transferência de leads
    // ainda não definido (risco operacional já registrado). Por ora, apenas confirma o envio.
    setSubmitted(true);
  };

  if (!materialTecnico) {
    return null;
  }

  return (
    <section
      id="material-tecnico"
      className="bg-white py-16 md:py-24"
      style={{ scrollMarginTop: 76 }}
    >
      <div className="mx-auto max-w-content px-6 md:px-24 grid lg:grid-cols-[1fr_1.1fr] gap-12 items-center">
        <div>
          <p className="text-blue-institutional text-[13px] font-bold tracking-wide mb-4">
            {materialTecnico.eyebrow}
          </p>
          <h2 className="font-heading text-navy font-bold text-2xl md:text-[28px] mb-4 max-w-md">
            {materialTecnico.heading}
          </h2>
          <p className="text-graytxt text-[15px] leading-relaxed max-w-md mb-8">
            {materialTecnico.subheading}
          </p>
          <img
            src={materialTecnico.imagemCapa.url}
            alt={materialTecnico.imagemCapa.alt}
            className="w-full max-w-[280px] rounded shadow-2xl"
          />
        </div>

        <div className="bg-white rounded-lg border border-cardborder p-6 md:p-8">
          {submitted ? (
            <div className="py-10 text-center">
              <p className="font-heading font-bold text-navy text-lg mb-2">
                Cadastro recebido.
              </p>
              <p className="text-graytxt text-sm">
                O material técnico será enviado para o e-mail informado.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <input
                  required
                  placeholder="Nome"
                  value={form.nome}
                  onChange={(e) => update("nome", e.target.value)}
                  className="border border-[#CDD1D8] rounded-sm px-4 py-3 text-sm placeholder:text-[#96999E] focus:outline-none focus:border-blue-institutional"
                />
                <input
                  required
                  type="email"
                  placeholder="E-mail profissional"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  className="border border-[#CDD1D8] rounded-sm px-4 py-3 text-sm placeholder:text-[#96999E] focus:outline-none focus:border-blue-institutional"
                />
                <input
                  placeholder="Telefone / WhatsApp"
                  value={form.telefone}
                  onChange={(e) => update("telefone", e.target.value)}
                  className="border border-[#CDD1D8] rounded-sm px-4 py-3 text-sm placeholder:text-[#96999E] focus:outline-none focus:border-blue-institutional"
                />
                <input
                  required
                  placeholder="CRMV"
                  value={form.crmv}
                  onChange={(e) => update("crmv", e.target.value)}
                  className="border border-[#CDD1D8] rounded-sm px-4 py-3 text-sm placeholder:text-[#96999E] focus:outline-none focus:border-blue-institutional"
                />
                <input
                  placeholder="Estado / cidade"
                  value={form.estadoCidade}
                  onChange={(e) => update("estadoCidade", e.target.value)}
                  className="border border-[#CDD1D8] rounded-sm px-4 py-3 text-sm placeholder:text-[#96999E] focus:outline-none focus:border-blue-institutional"
                />
                <input
                  placeholder="Especialidade"
                  value={form.especialidade}
                  onChange={(e) => update("especialidade", e.target.value)}
                  className="border border-[#CDD1D8] rounded-sm px-4 py-3 text-sm placeholder:text-[#96999E] focus:outline-none focus:border-blue-institutional"
                />
              </div>

              <label className="flex items-start gap-3 text-sm text-graytxt">
                <input
                  type="checkbox"
                  checked={form.jaClienteVirbac}
                  onChange={(e) => update("jaClienteVirbac", e.target.checked)}
                  className="mt-1"
                />
                Já é cliente Virbac?
              </label>
              <label className="flex items-start gap-3 text-sm text-graytxt">
                <input
                  type="checkbox"
                  checked={form.desejaContatoComercial}
                  onChange={(e) =>
                    update("desejaContatoComercial", e.target.checked)
                  }
                  className="mt-1"
                />
                Deseja receber contato ou visita da equipe comercial?
              </label>
              <label className="flex items-start gap-3 text-sm text-graytxt">
                <input
                  required
                  type="checkbox"
                  checked={form.aceitaLGPD}
                  onChange={(e) => update("aceitaLGPD", e.target.checked)}
                  className="mt-1"
                />
                Li e aceito a política de privacidade (LGPD)
              </label>

              <button
                type="submit"
                className="w-full sm:w-auto bg-gold text-navy font-bold text-sm px-7 py-4 rounded-sm hover:brightness-95 transition"
              >
                {materialTecnico.ctaLabel}
              </button>
              <p className="text-[#A0A5AF] text-xs leading-relaxed">
                {materialTecnico.legal}
              </p>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
