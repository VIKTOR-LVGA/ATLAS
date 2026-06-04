import { Lock, UserRound } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import type { ConsultingFutureModule } from "@/lib/consulting-intelligence";

type ConsultingFutureModulesGridProps = {
  modules: ConsultingFutureModule[];
};

const MAX_VISIBLE_MODULES = 3;

export function ConsultingFutureModulesGrid({
  modules,
}: ConsultingFutureModulesGridProps) {
  const visible = modules.slice(0, MAX_VISIBLE_MODULES);
  const hiddenCount = Math.max(0, modules.length - visible.length);

  return (
    <SectionCard
      title="Servizi consulenza — in preparazione"
      description="Prezzi, slot e profili consulente in preparazione"
      bodyClassName="space-y-3"
    >
      <div className="rounded-lg border border-dashed border-border bg-card-muted/40 px-3 py-2.5">
        <p className="flex items-center gap-2 text-[11px] text-muted">
          <UserRound className="h-3.5 w-3.5 shrink-0 text-accent" />
          Atlas non prenota appuntamenti né mostra disponibilità fittizia in questa versione.
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {visible.map((module) => (
          <li
            key={module.id}
            className="flex flex-col rounded-xl border border-dashed border-border bg-card-muted/30 p-3.5 opacity-90"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/20 text-muted">
                <Lock className="h-4 w-4" aria-hidden />
              </span>
              <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted">
                Non disponibile
              </span>
            </div>
            <p className="mt-2 text-[12px] font-semibold text-foreground">{module.label}</p>
            <p className="mt-1 flex-1 text-[11px] leading-relaxed text-muted">
              {module.description}
            </p>
            <p className="mt-2 border-t border-border-subtle pt-2 text-[10px] font-medium text-muted-foreground">
              {module.requirement}
            </p>
          </li>
        ))}
      </ul>
      {hiddenCount > 0 ? (
        <p className="text-[11px] text-muted">
          Altri {hiddenCount} servizi in preparazione — nessuna prenotazione attiva in questa
          versione.
        </p>
      ) : null}
    </SectionCard>
  );
}
