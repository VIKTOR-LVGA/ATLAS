import Link from "next/link";
import { BarChart3, Layers, TrendingDown } from "lucide-react";
import {
  LandingSection,
  LandingSectionHeader,
} from "@/components/landing/LandingSection";

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
                  <TrendingDown className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
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
              <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted">
                <BarChart3 className="h-3.5 w-3.5" />
                Esempio illustrativo · dati dimostrativi
              </p>

              <div className="mt-8 flex flex-col items-center gap-8 sm:flex-row sm:items-end sm:justify-center">
                <div className="relative flex h-40 w-40 items-center justify-center">
                  <div
                    className="absolute inset-0 rounded-full opacity-40 blur-2xl"
                    style={{ background: "rgba(52, 211, 153, 0.25)" }}
                  />
                  <svg viewBox="0 0 120 120" className="relative h-full w-full -rotate-90">
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth="10"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="48"
                      fill="none"
                      stroke="#34d399"
                      strokeWidth="10"
                      strokeDasharray="210 90"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute text-center">
                    <p className="text-2xl font-semibold text-white">—</p>
                    <p className="text-[10px] text-muted">benchmark in preparazione</p>
                  </div>
                </div>

                <div className="w-full max-w-[220px] space-y-4">
                  {[
                    { label: "Spesa attuale", width: "100%", color: "bg-indigo-500" },
                    { label: "Media mercato", width: "78%", color: "bg-slate-600" },
                    {
                      label: "Target ottimizzato",
                      width: "65%",
                      color: "bg-emerald-500",
                    },
                  ].map((bar) => (
                    <div key={bar.label}>
                      <div className="mb-1.5 flex justify-between text-[10px] text-muted">
                        <span>{bar.label}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-card/[0.06]">
                        <div
                          className={`h-full rounded-full ${bar.color} shadow-sm`}
                          style={{ width: bar.width }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 rounded-xl border border-white/[0.06] bg-card/[0.03] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
                      <Layers className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="text-[11px] text-muted">Protezione complessiva</p>
                      <p className="text-lg font-semibold text-white">78 / 100</p>
                    </div>
                  </div>
                  <span className="landing-badge-emerald">Buona base</span>
                </div>
                <p className="mt-3 text-[11px] leading-relaxed text-muted">
                  In app, i confronti usano solo premi e coperture estratti dai tuoi PDF.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LandingSection>
  );
}
