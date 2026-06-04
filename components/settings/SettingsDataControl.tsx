"use client";

import {
  CheckCircle2,
  Circle,
  Database,
  Download,
  FileText,
  ScrollText,
  Shield,
  Trash2,
  UserCog,
} from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import { useCurrentProfile } from "@/components/profile/ProfileProvider";
import { cn } from "@/lib/utils";

type DataControlItem = {
  id: string;
  label: string;
  detail: string;
  status: "available" | "info";
  icon: typeof Database;
};

type SettingsDataControlProps = {
  onGoToAccount: () => void;
  onGoToExport?: () => void;
};

export function SettingsDataControl({
  onGoToAccount,
  onGoToExport,
}: SettingsDataControlProps) {
  const profile = useCurrentProfile();

  const controls: DataControlItem[] = [
    {
      id: "portfolio",
      label: "Dati portfolio",
      detail: "Polizze, coperture estratte e collegamenti documenti",
      status: "info",
      icon: Database,
    },
    {
      id: "documents",
      label: "Documenti caricati",
      detail: "Metadati e stato analisi — i PDF restano nel tuo archivio Atlas",
      status: "info",
      icon: FileText,
    },
    {
      id: "policies",
      label: "Polizze estratte",
      detail: "Dati strutturati da conferma manuale o estrazione AI",
      status: "info",
      icon: ScrollText,
    },
    {
      id: "preferences",
      label: "Preferenze account",
      detail: profile?.hasProfileRow
        ? "Lingua, valuta, notifiche e contatti salvati sul profilo"
        : "Profilo in creazione — preferenze base dal login",
      status: "info",
      icon: UserCog,
    },
    {
      id: "export",
      label: "Esportazione dati",
      detail: "JSON strutturato e CSV polizze disponibili in questa sezione",
      status: "available",
      icon: Download,
    },
    {
      id: "portfolio-delete",
      label: "Eliminazione dati portfolio",
      detail: "Rimuove polizze, documenti e dati estratti — profilo accesso resta",
      status: "available",
      icon: Trash2,
    },
    {
      id: "profile-delete",
      label: "Richiesta eliminazione profilo",
      detail: "Chiusura account tramite supporto Atlas — verifica prima della cancellazione",
      status: "available",
      icon: Shield,
    },
  ];

  return (
    <SectionCard
      title="Controllo dati"
      description="Atlas ti permette di esportare e rimuovere i dati del portfolio direttamente dalle impostazioni."
      bodyClassName="space-y-4"
    >
      <ul className="space-y-2">
        {controls.map((item) => {
          const Icon = item.icon;
          const isAvailable = item.status === "available";

          return (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-xl border border-border-subtle bg-card-muted/30 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex min-w-0 items-start gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-foreground">{item.label}</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                    {item.detail}
                  </p>
                </div>
              </div>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 self-start rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide sm:self-center",
                  isAvailable
                    ? "border-[var(--success-text)]/30 bg-[var(--success-text)]/10 text-[var(--success-text)]"
                    : "border-border bg-card text-muted"
                )}
              >
                {isAvailable ? (
                  <CheckCircle2 className="h-3 w-3" aria-hidden />
                ) : (
                  <Circle className="h-3 w-3" aria-hidden />
                )}
                {isAvailable ? "Disponibile" : "Sul tuo account"}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {onGoToExport ? (
          <button
            type="button"
            onClick={onGoToExport}
            className="atlas-btn-secondary inline-flex min-h-[44px] w-full items-center justify-center gap-2 text-[12px] sm:w-auto"
          >
            <Download className="h-4 w-4" />
            Vai a esportazione
          </button>
        ) : null}
        <button
          type="button"
          onClick={onGoToAccount}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-[12px] font-semibold text-foreground transition hover:bg-card-muted sm:w-auto"
        >
          <Trash2 className="h-4 w-4 text-[var(--danger-text)]" />
          Gestione account ed eliminazioni
        </button>
      </div>

      <p className="rounded-lg border border-dashed border-border px-3 py-2 text-[11px] leading-relaxed text-muted">
        Qui trovi solo i controlli disponibili oggi nel prodotto: esportazione dati,
        correzioni salvate e gestione account.
      </p>
    </SectionCard>
  );
}
