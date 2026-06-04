import Link from "next/link";
import { BarChart3, Shield } from "lucide-react";
import { MarketCategoryMap } from "@/components/market/MarketCategoryMap";
import { MarketComparisonReadiness } from "@/components/market/MarketComparisonReadiness";
import { MarketEmptyState } from "@/components/market/MarketEmptyState";
import { MarketFutureModulesGrid } from "@/components/market/MarketFutureModulesGrid";
import { MarketIntelligenceOverview } from "@/components/market/MarketIntelligenceOverview";
import { MarketReadinessHero } from "@/components/market/MarketReadinessHero";
import { MarketUnlockSteps } from "@/components/market/MarketUnlockSteps";
import { PortfolioProgressionPanel } from "@/components/onboarding/PortfolioProgressionPanel";
import { PageHeader, PrimaryButton } from "@/components/ui/PageHeader";
import { PageShell } from "@/components/ui/PageShell";
import { SectionCard } from "@/components/ui/SectionCard";
import { RevealStagger } from "@/components/motion/RevealStagger";
import {
  atlasAsideColumn,
  atlasCard,
  atlasMainAside,
  atlasMainColumn,
  atlasSpace,
} from "@/lib/atlas-ui";
import { getMarketIntelligence } from "@/lib/market-intelligence";

export const metadata = { title: "Confronto mercato" };

export default async function MarketPage() {
  const intelligence = await getMarketIntelligence();
  const { readiness, progression, hasInsufficientData } = intelligence;

  return (
    <PageShell>
      <RevealStagger>
        <PageHeader
          title="Confronto di mercato"
          description="Atlas prepara il portafoglio per futuri confronti di mercato."
          action={
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href="/policies"
                className="atlas-btn-secondary inline-flex items-center gap-1.5 px-3 py-2 text-[12px]"
              >
                Vedi polizze
              </Link>
              <PrimaryButton href="/documents" icon={<BarChart3 className="h-4 w-4" />}>
                Carica PDF
              </PrimaryButton>
            </div>
          }
        />

        <div className={`${atlasCard.support} px-4 py-3 text-[12px] text-muted`}>
          I confronti di premio e benchmark svizzeri saranno disponibili quando attivi. I moduli
          benchmark restano bloccati finché non esiste un dataset CH verificato collegato al
          portafoglio.
        </div>

        <MarketReadinessHero readiness={readiness} />

        {!hasInsufficientData ? (
          <MarketIntelligenceOverview signals={intelligence.overview} />
        ) : null}

        {progression.showOnboardingFocus && hasInsufficientData ? (
          <PortfolioProgressionPanel progression={progression} compact />
        ) : null}

        {hasInsufficientData ? (
          <MarketEmptyState intelligence={intelligence} />
        ) : (
          <div className={atlasMainAside}>
            <div className={`${atlasMainColumn} ${atlasSpace.block}`}>
              <MarketComparisonReadiness blockers={readiness.blockers} />
              <MarketCategoryMap
                categories={intelligence.categories}
                missingCount={intelligence.missingCategoryCount}
              />
              <MarketFutureModulesGrid modules={intelligence.futureModules} />

              <SectionCard title="Segnali portafoglio" padding="sm" tone="support">
                <ul className="grid gap-2 sm:grid-cols-2">
                  {intelligence.overview
                    .filter((signal) =>
                      ["coverages", "confirmed", "pdfs", "confidence"].includes(signal.id)
                    )
                    .map((signal) => (
                      <li
                        key={signal.id}
                        className="rounded-lg border border-border-subtle bg-card-muted/40 px-3 py-2.5"
                      >
                        <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
                          {signal.label}
                        </p>
                        <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-foreground">
                          {signal.available ? signal.value : "—"}
                        </p>
                        <p className="mt-0.5 text-[10px] text-muted">{signal.subtext}</p>
                      </li>
                    ))}
                </ul>
              </SectionCard>
            </div>

            <aside className={atlasAsideColumn}>
              <MarketUnlockSteps steps={readiness.unlockSteps} />
              {progression.showOnboardingFocus ? (
                <PortfolioProgressionPanel progression={progression} compact />
              ) : null}
            </aside>
          </div>
        )}

        <div
          className={`${atlasCard.secondary} flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between`}
        >
          <div className="flex items-start gap-3">
            <Shield className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
            <div>
              <p className="text-[13px] font-semibold text-foreground">
                Benchmark in preparazione
              </p>
              <p className="text-[12px] text-muted">
                {intelligence.comparisonEligibleCount} polizza
                {intelligence.comparisonEligibleCount === 1 ? "" : "e"} idonea
                {intelligence.comparisonEligibleCount === 1 ? "" : "e"} per confronti futuri.
                {intelligence.providersIdentified.length > 0
                  ? ` ${intelligence.providersIdentified.length} compagnia${intelligence.providersIdentified.length === 1 ? "" : "e"} identificata${intelligence.providersIdentified.length === 1 ? "" : "e"}.`
                  : ""}
              </p>
            </div>
          </div>
          <Link
            href="/documents"
            className="shrink-0 rounded-lg border border-border px-4 py-2 text-[12px] font-medium text-muted-foreground hover:bg-card-muted"
          >
            Arricchisci archivio
          </Link>
        </div>
      </RevealStagger>
    </PageShell>
  );
}
