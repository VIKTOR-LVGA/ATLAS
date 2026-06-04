import Link from "next/link";
import { BarChart3, CheckCircle2, Clock, Layers } from "lucide-react";
import {
  LandingSection,
  LandingSectionHeader,
} from "@/components/landing/LandingSection";

const readinessItems = [
  {
    icon: Layers,
    label: "Dati portfolio",
    status: "In preparazione",
    detail: "Premi e coperture dai tuoi PDF, da confermare in revisione",
  },
  {
    icon: Clock,
    label: "Premi e rinnovi",
    status: "Da verificare",
    detail: "Date e importi estratti — validazione manuale consigliata",
  },
  {
    icon: BarChart3,
    label: "Categorie rilevate",
    status: "In preparazione",
    detail: "LAMal, complementari e altre linee dopo conferma polizze",
  },
] as const;

export function LandingMarketComparison() {
  return (
    <LandingSection tone="glow" grid className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <LandingSectionHeader
              eyebrow="Analisi e mercato"
              title="Individua sprechi, duplicati e aree da verificare"
              description="Atlas organizza premi e coperture dai tuoi PDF e prepara il portfolio per futuri confronti. I benchmark di mercato sono in preparazione."
            />
            <ul className="mt-8 space-y-3.5 text-sm text-muted">
              {[
                "Alert su possibili doppioni tra polizze",
                "Coperture non assegnate evidenziate per revisione",
                "Preparazione per confronti futuri nell'app",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/register"
              className="mt-8 inline-flex items-center gap-1 text-sm font-medium text-indigo-300 transition hover:text-indigo-200"
            >
              Inizia e analizza le tue polizze →
            </Link>
          </div>

          <div className="landing-preview-aura">
            <div className="landing-preview-frame p-5 sm:p-6">
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                Esempio illustrativo
              </p>

              <div className="mt-6 rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300/90">
                  Benchmark in preparazione
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  Nessun confronto di mercato attivo in questa anteprima — solo
                  readiness del portfolio.
                </p>
              </div>

              <div className="mt-5 space-y-3">
                {readinessItems.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-card/[0.03] p-3.5"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                      <item.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[12px] font-medium text-white">{item.label}</p>
                        <span className="landing-badge-amber text-[9px]">
                          {item.status}
                        </span>
                      </div>
                      <p className="mt-1 text-[10px] leading-relaxed text-muted">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 rounded-xl border border-white/[0.06] bg-card/[0.03] p-4">
                <p className="text-[11px] leading-relaxed text-muted">
                  Pronto per futuri confronti quando il portfolio sarà verificato
                  nell&apos;app — senza medie di mercato o target ottimizzati in
                  questa fase.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LandingSection>
  );
}
