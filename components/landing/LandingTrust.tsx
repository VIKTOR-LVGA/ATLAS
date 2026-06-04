import { Eye, Lock, Server, ShieldCheck } from "lucide-react";
import { LandingTrustVisual } from "@/components/landing/LandingTrustVisual";
import {
  LandingSection,
  LandingSectionHeader,
} from "@/components/landing/LandingSection";

const pillars = [
  {
    icon: Lock,
    title: "Accesso riservato",
    description:
      "I documenti e le schede polizza restano nel tuo account, con controlli di accesso applicativi.",
  },
  {
    icon: ShieldCheck,
    title: "Revisione prima dell'uso",
    description:
      "Le bozze AI richiedono conferma: niente dati trattati come definitivi senza la tua verifica.",
  },
  {
    icon: Server,
    title: "Pensato per la Svizzera",
    description:
      "Flussi e campi orientati alle polizze svizzere, con attenzione alla privacy dei documenti.",
  },
  {
    icon: Eye,
    title: "Trasparente",
    description:
      "Nessuna vendita di polizze. Nessun broker. Solo analisi indipendente.",
  },
];

export function LandingTrust() {
  return (
    <LandingSection id="security" tone="lift" className="py-20 md:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-6 lg:grid-cols-2">
        <div className="relative flex justify-center lg:justify-start">
          <LandingTrustVisual />
        </div>

        <div>
          <LandingSectionHeader
            eyebrow="Fiducia"
            title="I tuoi documenti. Il tuo portfolio."
            description="Atlas non è un intermediario assicurativo. Non ti contatteranno compagnie per venderti polizze. Il prodotto serve a darti chiarezza su ciò che hai già."
          />

          <div className="mt-10 grid gap-3 sm:grid-cols-2">
            {pillars.map((pillar) => (
              <div
                key={pillar.title}
                className="landing-glass rounded-xl p-4 transition hover:border-white/12"
              >
                <pillar.icon className="h-5 w-5 text-indigo-400" />
                <p className="mt-3 font-medium text-white">{pillar.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  {pillar.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LandingSection>
  );
}
