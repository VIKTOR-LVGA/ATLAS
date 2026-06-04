import { Lock, Sparkles } from "lucide-react";
import { SectionCard } from "@/components/ui/SectionCard";
import type { MarketFutureModule } from "@/lib/market-intelligence";
import { cn } from "@/lib/utils";

type MarketFutureModulesGridProps = {
  modules: MarketFutureModule[];
};

const MAX_VISIBLE_MODULES = 3;

export function MarketFutureModulesGrid({ modules }: MarketFutureModulesGridProps) {
  const visible = modules.slice(0, MAX_VISIBLE_MODULES);
  const hiddenCount = Math.max(0, modules.length - visible.length);

  return (
    <SectionCard
      title="Moduli mercato — in preparazione"
      description="Roadmap intelligence: nessun calcolo attivo finché non esiste un dataset benchmark reale"
      bodyClassName="space-y-3"
    >
      <div className="rounded-lg border border-dashed border-border bg-card-muted/40 px-3 py-2.5">
        <p className="flex items-center gap-2 text-[11px] text-muted">
          <Sparkles className="h-3.5 w-3.5 shrink-0 text-accent" />
          I moduli benchmark e confronto premio saranno disponibili quando attivi.
        </p>
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {visible.map((module) => (
          <li
            key={module.id}
            className={cn(
              "relative flex flex-col rounded-xl border border-dashed border-border bg-card-muted/30 p-3.5",
              "opacity-90"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/20 text-muted">
                <Lock className="h-4 w-4" aria-hidden />
              </span>
              <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted">
                Bloccato
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
          Altri {hiddenCount} moduli in preparazione — attivazione quando il servizio sarà
          disponibile.
        </p>
      ) : null}
    </SectionCard>
  );
}
