import {
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  User,
  Users,
} from "lucide-react";
import {
  LandingSection,
  LandingSectionHeader,
} from "@/components/landing/LandingSection";

export function LandingProductShowcase() {
  return (
    <LandingSection id="product" tone="lift" className="py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <LandingSectionHeader
          eyebrow="Prodotto"
          title="Dal PDF alla struttura che puoi verificare"
          description="Upload, estrazione AI, raggruppamento per persona, coperture da verificare e conferma della polizza — nello stesso flusso che usi nell'app."
        />

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="landing-preview-aura">
            <div className="landing-preview-frame p-1">
              <div className="landing-preview-inner rounded-[14px] p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                      Dettaglio polizza
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-white">
                      CSS · Cassa malati
                    </h3>
                    <p className="text-[11px] text-muted">Bozza AI · Da rivedere</p>
                  </div>
                  <span className="landing-badge-amber">Da rivedere</span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 min-[400px]:grid-cols-3">
                  {[
                    { label: "Persone", value: "2" },
                    { label: "Coperture", value: "7" },
                    { label: "Confidenza", value: "87%" },
                  ].map((item) => (
                    <div key={item.label} className="landing-stat-chip text-center">
                      <p className="text-[9px] text-muted">{item.label}</p>
                      <p className="mt-0.5 text-sm font-semibold text-white">
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 space-y-2">
                  <p className="text-[11px] font-medium text-muted">
                    Persone assicurate
                  </p>
                  {[
                    {
                      name: "Mario Rossi",
                      coverages: "LAMal, Complementare",
                      premium: "CHF 412",
                    },
                    {
                      name: "Anna Keller",
                      coverages: "LAMal, Spital, Telmed",
                      premium: "CHF 198",
                    },
                  ].map((person) => (
                    <div
                      key={person.name}
                      className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-card/[0.03] p-2.5"
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-400">
                        <User className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium text-[var(--landing-text)]">
                          {person.name}
                        </p>
                        <p className="truncate text-[9px] text-muted">
                          {person.coverages}
                        </p>
                      </div>
                      <p className="text-[10px] font-medium text-muted">
                        {person.premium}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-lg border border-amber-500/20 bg-amber-500/10 px-3 py-2">
                  <p className="flex items-center gap-1.5 text-[10px] font-medium text-amber-200/90">
                    <AlertTriangle className="h-3 w-3" />
                    1 copertura da verificare — assegna manualmente
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="landing-preview-aura flex-1">
              <div className="landing-preview-frame h-full p-1">
                <div className="landing-preview-inner rounded-[14px] p-4 sm:p-5">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-300" />
                    <p className="text-[12px] font-semibold text-white">
                      Estrazione AI strutturata
                    </p>
                  </div>
                  <p className="mt-2 text-[11px] leading-relaxed text-muted">
                    Normalizzazione svizzera (LAMal, complementari, franchigie, modelli
                    Telmed/HMO) con punteggio di confidenza per campo.
                  </p>
                  <div className="mt-3 space-y-2">
                    {[
                      { field: "Compagnia", conf: "98%", ok: true },
                      { field: "Persone assicurate", conf: "92%", ok: true },
                      { field: "Premio famiglia", conf: "87%", ok: true },
                      { field: "Assegnazione copertura", conf: "64%", ok: false },
                    ].map((row) => (
                      <div
                        key={row.field}
                        className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-card/[0.02] px-2.5 py-1.5"
                      >
                        <span className="text-[10px] text-muted">{row.field}</span>
                        <span
                          className={`text-[10px] font-medium ${row.ok ? "text-emerald-400" : "text-amber-400"}`}
                        >
                          {row.conf}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="landing-glass rounded-2xl p-5 ring-1 ring-indigo-500/15">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300">
                  <Users className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium text-white">Revisione e conferma</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted">
                    Correggi assegnazioni, premi e persone nel workspace di revisione.
                    Conferma la polizza quando i dati corrispondono al PDF.
                  </p>
                  <p className="mt-3 flex items-center gap-1.5 text-[12px] text-emerald-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Flusso già disponibile in Atlas
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </LandingSection>
  );
}
