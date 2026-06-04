import { Shield } from "lucide-react";
import { ConfidenceBadge } from "@/components/ui/ConfidenceBadge";
import {
  formatCoverageDisplayLabel,
  formatCoverageDisplaySubtitle,
} from "@/lib/coverage-display-labels";
import { formatCoveragePremiumDisplay } from "@/lib/coverage-premium-free";
import { getCoverageNetPremium } from "@/lib/policy-health-grouping";
import { formatCHF } from "@/lib/utils";
import type { PolicyCoverageDetail, PolicyPremiumFrequency } from "@/lib/types";

const premiumFrequencyLabels: Record<PolicyPremiumFrequency, string> = {
  monthly: "mensile",
  quarterly: "trimestrale",
  semiannual: "semestrale",
  annual: "annuale",
};

export function PolicyCoverageCard({ coverage }: { coverage: PolicyCoverageDetail }) {
  return (
    <article className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent">
            <Shield className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground">
              {formatCoverageDisplayLabel(coverage)}
            </p>
            <p className="mt-0.5 text-[11px] text-muted">
              {formatCoverageDisplaySubtitle(coverage) ?? "Copertura"}
            </p>
          </div>
        </div>
        <ConfidenceBadge
          confidence={coverage.confidence}
          uncertain={coverage.uncertain}
        />
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-[11px]">
        <div>
          <dt className="text-muted">Premio</dt>
          <dd className="mt-0.5 font-medium text-foreground">
            {getCoverageNetPremium(coverage) != null ||
            coverage.premium_final === 0
              ? `${formatCoveragePremiumDisplay(coverage)}${
                  coverage.premium_frequency
                    ? ` / ${premiumFrequencyLabels[coverage.premium_frequency]}`
                    : ""
                }`
              : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted">Franchise</dt>
          <dd className="mt-0.5 font-medium text-foreground">
            {coverage.franchise != null || coverage.deductible != null
              ? formatCHF(coverage.franchise ?? coverage.deductible ?? 0)
              : "—"}
          </dd>
        </div>
      </dl>
      {coverage.notes ? (
        <p className="mt-2 line-clamp-2 text-[11px] text-muted">{coverage.notes}</p>
      ) : null}
    </article>
  );
}
