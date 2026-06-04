import {
  Building2,
  Heart,
  Plane,
  Scale,
  Shield,
  Stethoscope,
  User,
  UserRound,
} from "lucide-react";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import { SectionCard } from "@/components/ui/SectionCard";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { HealthPolicyGroupedView } from "@/lib/policy-health-grouping";
import {
  formatCoverageDisplayLabel,
  formatCoverageDisplaySubtitle,
} from "@/lib/coverage-display-labels";
import {
  formatCoveragePremiumLabel,
  formatPersonPremium,
  getCoverageTier,
  getCoverageTierLabel,
  isCoverageUncertain,
} from "@/lib/policy-detail-display";
import type { InsuredPersonWithCoverages } from "@/lib/policy-health-grouping";
import type { PolicyCoverageDetail } from "@/lib/types";
import { formatCHF } from "@/lib/utils";

function CoverageIcon({
  coverage,
  className = "h-3.5 w-3.5",
}: {
  coverage: PolicyCoverageDetail;
  className?: string;
}) {
  const kind = `${coverage.coverage_type ?? ""} ${coverage.category_label ?? ""} ${coverage.name}`.toLowerCase();

  if (/(hospital|ospedal|spital|privat)/.test(kind)) {
    return <Building2 className={className} />;
  }
  if (/(travel|viagg|world|mondo)/.test(kind)) {
    return <Plane className={className} />;
  }
  if (/(legal|giurid|advocare|protezione giuridica)/.test(kind)) {
    return <Scale className={className} />;
  }
  if (/(complement|lca|vvg|completa|benefit|dent)/.test(kind)) {
    return <Stethoscope className={className} />;
  }
  if (/(lamal|base|grund|assicurazione di base|kvg)/.test(kind)) {
    return <Heart className={className} />;
  }

  return <Shield className={className} />;
}

function groupCoveragesByTier(coverages: PolicyCoverageDetail[]) {
  const tiers: Array<"base" | "complementary" | "other"> = [
    "base",
    "complementary",
    "other",
  ];

  return tiers
    .map((tier) => ({
      tier,
      label: getCoverageTierLabel(tier),
      items: coverages.filter((coverage) => getCoverageTier(coverage) === tier),
    }))
    .filter((group) => group.items.length > 0);
}

function PersonCoverageItem({ coverage }: { coverage: PolicyCoverageDetail }) {
  const label = formatCoverageDisplayLabel(coverage);
  const subtitle = formatCoverageDisplaySubtitle(coverage);
  const uncertain = isCoverageUncertain(coverage);
  const franchise =
    coverage.franchise ?? coverage.deductible ?? null;

  return (
    <li className="atlas-row-interactive flex gap-2.5 rounded-lg border border-border-subtle bg-card-muted/60 px-2.5 py-2">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-card text-accent shadow-sm">
        <CoverageIcon coverage={coverage} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[12px] font-semibold leading-snug text-foreground">
              {label}
            </p>
            {subtitle ? (
              <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                {subtitle}
              </p>
            ) : null}
          </div>
          <p className="shrink-0 text-[12px] font-semibold tabular-nums text-foreground">
            {formatCoveragePremiumLabel(coverage)}
          </p>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <StatusBadge
            variant={getCoverageTier(coverage) === "base" ? "ok" : "neutral"}
            label={getCoverageTierLabel(getCoverageTier(coverage))}
          />
          {franchise !== null ? (
            <span className="text-[10px] text-muted">
              Franchigia {formatCHF(franchise)}
            </span>
          ) : null}
          {uncertain ? (
            <ConfidenceBadge
              confidence={coverage.ownership_confidence ?? coverage.confidence}
              uncertain
            />
          ) : null}
        </div>
      </div>
    </li>
  );
}

function InsuredPersonIntelligenceCard({
  person,
  index,
}: {
  person: InsuredPersonWithCoverages;
  index: number;
}) {
  const personTotal =
    person.total_monthly_premium ??
    person.premium_amount ??
    person.computedLineTotal;
  const tierGroups = groupCoveragesByTier(person.coverages);
  const hasWarnings =
    person.uncertain ||
    person.coverages.some(isCoverageUncertain) ||
    person.coverages.length === 0;

  return (
    <article className="atlas-surface-card-interactive overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border-subtle px-3.5 py-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--success-bg)] text-[var(--success-text)] ring-1 ring-black/5 dark:ring-white/5">
            <User className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Persona {index + 1}
            </p>
            <h3 className="mt-0.5 truncate text-[14px] font-semibold text-foreground">
              {person.name ?? "Persona assicurata"}
            </h3>
            {person.insured_number ? (
              <p className="mt-0.5 text-[11px] text-muted">
                N. assicurato {person.insured_number}
              </p>
            ) : (
              <p className="mt-0.5 text-[11px] text-muted">N. assicurato — Da verificare</p>
            )}
          </div>
        </div>
        <ConfidenceBadge confidence={person.confidence} uncertain={person.uncertain} />
      </div>

      <div className="grid grid-cols-1 gap-2 border-b border-border-subtle bg-card-muted/30 px-3.5 py-2.5 min-[400px]:grid-cols-2 lg:grid-cols-4">
        <PersonMeta label="Modello" value={person.model ?? "Non disponibile"} />
        <PersonMeta
          label="Franchigia"
          value={
            person.franchise != null
              ? formatCHF(person.franchise)
              : person.deductible != null
                ? formatCHF(person.deductible)
                : "Non disponibile"
          }
        />
        <PersonMeta
          label="Premio base"
          value={formatPersonPremium(person.base_premium) ?? "Non disponibile"}
        />
        <PersonMeta
          label="Complementare"
          value={
            formatPersonPremium(person.complementary_premium) ?? "Non disponibile"
          }
        />
      </div>

      {hasWarnings ? (
        <div className="border-b border-border-subtle px-3.5 py-2">
          {person.coverages.length === 0 ? (
            <p className="text-[11px] text-[var(--warning-text)]">
              Nessuna copertura assegnata — verifica il raggruppamento.
            </p>
          ) : person.uncertain || person.coverages.some(isCoverageUncertain) ? (
            <p className="text-[11px] text-[var(--warning-text)]">
              Alcune righe richiedono verifica manuale.
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-3 px-3.5 py-3">
        {tierGroups.length > 0 ? (
          tierGroups.map((group) => (
            <div key={group.tier}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted">
                {group.label}
              </p>
              <ul className="space-y-1.5">
                {group.items.map((coverage, coverageIndex) => (
                  <PersonCoverageItem
                    key={`${coverage.name}-${coverageIndex}`}
                    coverage={coverage}
                  />
                ))}
              </ul>
            </div>
          ))
        ) : (
          <p className="text-[12px] text-muted">Nessuna copertura raggruppata per questa persona.</p>
        )}
      </div>

      {personTotal !== null && personTotal !== undefined ? (
        <div className="flex items-center justify-between border-t border-border-subtle bg-accent-soft/40 px-3.5 py-2.5">
          <span className="text-[11px] font-medium text-muted-foreground">Totale persona</span>
          <span className="text-[13px] font-semibold tabular-nums text-foreground">
            {formatCHF(personTotal)}
          </span>
        </div>
      ) : null}
    </article>
  );
}

function PersonMeta({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] text-muted">{label}</p>
      <p className="mt-0.5 truncate text-[11px] font-medium text-foreground">{value}</p>
    </div>
  );
}

export function PolicyInsuredPeopleIntelligence({
  grouped,
}: {
  grouped: HealthPolicyGroupedView;
}) {
  if (grouped.people.length === 0) {
    return (
      <SectionCard title="Persone assicurate" description="Riepilogo per persona assicurata">
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <UserRound className="h-8 w-8 text-muted" />
          <p className="text-[13px] font-medium text-foreground">Nessuna persona rilevata</p>
          <p className="max-w-sm text-[12px] text-muted">
            Carica o rivedi il PDF per estrarre le persone assicurate e le relative coperture.
          </p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      title="Persone assicurate"
      description="Coperture, premi e franchise raggruppati per persona — chi possiede cosa."
      bodyClassName="space-y-2.5 p-3.5 sm:p-4"
      padding="none"
    >
      {grouped.people.map((person, index) => (
        <InsuredPersonIntelligenceCard
          key={`${person.insured_number ?? person.name ?? "person"}-${index}`}
          person={person}
          index={index}
        />
      ))}

      {grouped.familyPremium !== null ? (
        <div className="atlas-action-strip mt-1 flex items-center justify-between gap-2 rounded-lg px-3 py-2.5">
          <span className="text-[11px] font-medium text-muted-foreground">
            Premio famiglia (documento)
          </span>
          <span className="text-[13px] font-semibold text-accent">
            {formatCHF(grouped.familyPremium)}
          </span>
        </div>
      ) : null}
    </SectionCard>
  );
}
