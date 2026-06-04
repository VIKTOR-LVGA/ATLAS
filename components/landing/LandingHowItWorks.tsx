import { LineChart, Sparkles, Upload, UserCheck } from "lucide-react";
import {
  LandingSection,
  LandingSectionHeader,
} from "@/components/landing/LandingSection";

const steps = [
  {
    icon: Upload,
    title: "Carica",
    description:
      "Carichi i PDF delle polizze in modo sicuro. Atlas li conserva nel tuo archivio privato.",
  },
  {
    icon: Sparkles,
    title: "Estrazione AI",
    description:
      "L'AI legge il documento, normalizza i dati svizzeri e struttura persone, coperture e premi.",
  },
  {
    icon: UserCheck,
    title: "Revisione",
    description:
      "Verifichi bozze AI, assegni coperture alle persone corrette e confermi la polizza.",
  },
  {
    icon: LineChart,
    title: "Portfolio",
    description:
      "Leggi, organizza e revisioni le polizze; Atlas prepara il portfolio per futuri confronti quando i dati saranno verificati.",
  },
];

export function LandingHowItWorks() {
  return (
    <LandingSection id="how-it-works" tone="deep" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <LandingSectionHeader
          eyebrow="Come funziona"
          title="Dalla polizza alla chiarezza in 4 passi"
          description="Ogni fase corrisponde a funzionalità già presenti in Atlas — non a promesse future."
          align="center"
        />

        <div className="relative mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          <div
            className="absolute left-[8%] right-[8%] top-9 hidden h-px bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent lg:block"
            aria-hidden
          />
          {steps.map((step, index) => (
            <div
              key={step.title}
              className="landing-glass group relative rounded-2xl p-6 transition hover:border-white/15"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 transition group-hover:bg-indigo-500/15">
                <step.icon className="h-5 w-5" />
              </div>
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-wider text-indigo-400/90">
                Passo {index + 1}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </LandingSection>
  );
}
