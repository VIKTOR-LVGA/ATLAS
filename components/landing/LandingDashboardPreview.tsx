import type { ComponentType, ReactNode } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  FileText,
  LayoutDashboard,
  LineChart,
  Shield,
  Sparkles,
  TrendingUp,
  Upload,
  Users,
  Wallet,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, active: true },
  { label: "Polizze", icon: FileText, active: false },
  { label: "Mercato", icon: LineChart, active: false },
  { label: "Analisi", icon: Sparkles, active: false },
  { label: "Persone", icon: Users, active: false },
];

function StatCard({
  label,
  value,
  icon: Icon,
  accent = "text-white",
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  accent?: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-[#121a2e] p-2.5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white/[0.06] text-slate-400">
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <p className="mt-2 text-[8px] font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className={`mt-0.5 text-[13px] font-semibold leading-tight ${accent}`}>
        {value}
      </p>
    </div>
  );
}

function InsightRow({
  tone,
  children,
}: {
  tone: "amber" | "emerald" | "indigo";
  children: ReactNode;
}) {
  const styles = {
    amber: "border-amber-500/20 bg-amber-500/10 text-amber-100",
    emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100",
    indigo: "border-indigo-500/20 bg-indigo-500/10 text-indigo-100",
  };
  const icons = {
    amber: AlertTriangle,
    emerald: CheckCircle2,
    indigo: Sparkles,
  };
  const Icon = icons[tone];

  return (
    <li
      className={`flex items-start gap-2 rounded-lg border px-2 py-1.5 text-[9px] leading-snug ${styles[tone]}`}
    >
      <Icon className="mt-0.5 h-3 w-3 shrink-0 opacity-90" />
      <span>{children}</span>
    </li>
  );
}

function PolicyRow({
  provider,
  premium,
  status,
  statusTone,
}: {
  provider: string;
  premium: string;
  status: string;
  statusTone: "ok" | "review" | "duplicate";
}) {
  const badge =
    statusTone === "ok"
      ? "landing-badge-emerald"
      : statusTone === "review"
        ? "landing-badge-amber"
        : "bg-rose-500/15 text-rose-300 text-[8px] font-medium px-1.5 py-0.5 rounded-full";

  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-[#0f1524] px-2 py-1.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-300">
        <Shield className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-medium text-slate-200">{provider}</p>
        <p className="text-[9px] text-slate-500">{premium}</p>
      </div>
      <span className={`shrink-0 ${badge}`}>{status}</span>
    </div>
  );
}

export function LandingDashboardPreview() {
  return (
    <div className="landing-hero-stage landing-float relative w-full">
      <div className="landing-hero-stage-glow opacity-70" aria-hidden />

      <div className="landing-preview-aura relative z-[1]">
        <div className="landing-preview-frame p-1.5">
          <div className="landing-preview-inner overflow-hidden rounded-xl">
            <div className="flex min-h-[340px] sm:min-h-[360px]">
              <aside className="hidden w-[108px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0a0f1a] py-3 sm:flex">
                <div className="flex items-center gap-2 px-3 pb-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/25 text-indigo-200">
                    <Shield className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[10px] font-semibold text-slate-300">Atlas</span>
                </div>
                <nav className="flex flex-1 flex-col gap-0.5 px-2">
                  {navItems.map((item) => (
                    <span
                      key={item.label}
                      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[9px] font-medium ${
                        item.active
                          ? "bg-indigo-500/20 text-indigo-200"
                          : "text-slate-500"
                      }`}
                    >
                      <item.icon className="h-3.5 w-3.5 shrink-0" />
                      {item.label}
                    </span>
                  ))}
                </nav>
                <div className="px-2 pt-1">
                  <span className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[9px] text-slate-600">
                    <Upload className="h-3.5 w-3.5" />
                    Documenti
                  </span>
                </div>
              </aside>

              <div className="min-w-0 flex-1 bg-[#0c1220] p-3 sm:p-3.5">
                <p className="text-[9px] font-medium uppercase tracking-wide text-slate-500">
                  Esempio illustrativo
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[12px] font-semibold text-white sm:text-[13px]">
                    La tua dashboard
                  </p>
                  <div className="flex items-center gap-1.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.04] text-slate-400">
                      <Bell className="h-3.5 w-3.5" />
                    </span>
                    <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[8px] font-medium text-white">
                      Carica documento
                    </span>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                  <StatCard label="Polizze totali" value="—" icon={FileText} />
                  <StatCard
                    label="Da rivedere"
                    value="Da verificare"
                    icon={TrendingUp}
                    accent="text-amber-400"
                  />
                  <StatCard label="Avvisi importanti" value="—" icon={AlertTriangle} />
                  <StatCard
                    label="Spesa annuale"
                    value="Da verificare"
                    icon={Wallet}
                  />
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/[0.08] bg-[#121a2e] p-2.5">
                    <p className="text-[10px] font-semibold text-slate-200">
                      Analisi intelligente
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      <InsightRow tone="emerald">
                        Premi e coperture — da confermare in revisione
                      </InsightRow>
                      <InsightRow tone="amber">
                        Possibili duplicati — da verificare
                      </InsightRow>
                      <InsightRow tone="indigo">
                        Assegnazione copertura — in revisione
                      </InsightRow>
                    </ul>
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-[#121a2e] p-2.5">
                    <p className="text-[10px] font-semibold text-slate-200">
                      Le tue polizze
                    </p>
                    <div className="mt-2 space-y-1">
                      <PolicyRow
                        provider="Polizza sanitaria"
                        premium="Premio da verificare"
                        status="In revisione"
                        statusTone="review"
                      />
                      <PolicyRow
                        provider="Copertura complementare"
                        premium="Premio da verificare"
                        status="Da rivedere"
                        statusTone="review"
                      />
                      <PolicyRow
                        provider="Documento PDF"
                        premium="Non disponibile"
                        status="In preparazione"
                        statusTone="ok"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 rounded-xl border border-indigo-500/25 bg-indigo-500/10 p-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="flex items-center gap-1.5 text-[9px] font-medium text-indigo-100">
                      <Sparkles className="h-3 w-3 text-indigo-300" />
                      Estrazione AI · polizza sanitaria
                    </span>
                    <span className="landing-badge-indigo">Da verificare</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {["LAMal", "Complementare", "Spital", "Telmed"].map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-white/[0.08] bg-[#0f1524] px-1.5 py-0.5 text-[8px] text-slate-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
