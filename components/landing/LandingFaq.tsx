import { LandingSection, LandingSectionHeader } from "@/components/landing/LandingSection";

const faqs = [
  {
    q: "Atlas vende polizze assicurative?",
    a: "No. Atlas è una piattaforma indipendente di analisi. Estrae e organizza i dati dai tuoi PDF — non riceve commissioni da assicuratori.",
  },
  {
    q: "Cosa fa l'estrazione AI in pratica?",
    a: "Legge i PDF delle polizze svizzere, normalizza i campi (persone, coperture, premi, franchigie) e crea schede strutturate da rivedere e confermare.",
  },
  {
    q: "Posso correggere le assegnazioni tra persone e coperture?",
    a: "Sì. Nel flusso di revisione puoi riassegnare ogni copertura a qualsiasi persona assicurata, modificare premi e confermare la polizza.",
  },
  {
    q: "I miei dati sono al sicuro?",
    a: "Atlas tratta i documenti con attenzione e controllo. I PDF restano nel tuo account e le bozze AI vanno confermate prima dell'uso.",
  },
];

export function LandingFaq() {
  return (
    <LandingSection id="faq" tone="deep" className="py-20 md:py-24">
      <div className="mx-auto max-w-2xl px-6">
        <LandingSectionHeader
          eyebrow="FAQ"
          title="Domande frequenti"
          align="center"
        />

        <div className="mt-12 space-y-2">
          {faqs.map((faq) => (
            <details
              key={faq.q}
              className="group landing-glass rounded-xl px-5 py-4 transition open:border-indigo-500/20 open:bg-indigo-500/[0.06]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium text-[var(--landing-text)] marker:content-none [&::-webkit-details-marker]:hidden">
                {faq.q}
                <span className="shrink-0 text-muted transition group-open:rotate-45 group-open:text-indigo-400">
                  +
                </span>
              </summary>
              <p className="mt-3 border-t border-white/[0.06] pt-3 text-sm leading-relaxed text-muted">
                {faq.a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </LandingSection>
  );
}
