import type { HealthPolicyGroupedView } from "@/lib/policy-health-grouping";
import { formatCoveragePremiumDisplay } from "@/lib/coverage-premium-free";
import type {
  PolicyCoverageDetail,
  PolicyExtractionMetadata,
  PolicyFieldConfidence,
  UserPolicy,
} from "@/lib/types";
import { formatCHF } from "@/lib/utils";

export type CoverageTier = "base" | "complementary" | "other";

export type PolicyTimelineStepState = "complete" | "current" | "pending" | "unavailable";

export interface PolicyTimelineStep {
  id: string;
  label: string;
  description: string;
  state: PolicyTimelineStepState;
}

export interface PolicyCoverageSegment {
  tier: CoverageTier;
  label: string;
  count: number;
}

export interface PolicyCoverageIntelligenceSummary {
  totalCoverages: number;
  assignedToPeople: number;
  unassigned: number;
  uncertain: number;
  lowOwnership: number;
  segments: PolicyCoverageSegment[];
  completenessPercent: number | null;
}

export interface PolicyReviewCenterItem {
  id: string;
  title: string;
  description: string;
  tone: "attention" | "warning" | "neutral" | "success";
}

export function getCoverageTier(coverage: PolicyCoverageDetail): CoverageTier {
  const kind = `${coverage.coverage_type ?? ""} ${coverage.category_label ?? ""} ${coverage.name}`.toLowerCase();

  if (/(lamal|base|grund|kvg|assicurazione di base|obbligatori)/.test(kind)) {
    return "base";
  }

  if (/(complement|lca|vvg|completa|benefit|dent|supplement)/.test(kind)) {
    return "complementary";
  }

  return "other";
}

export function getCoverageTierLabel(tier: CoverageTier): string {
  switch (tier) {
    case "base":
      return "Base (LAMal)";
    case "complementary":
      return "Complementare";
    default:
      return "Altre coperture";
  }
}

export function isCoverageUncertain(coverage: PolicyCoverageDetail): boolean {
  if (coverage.uncertain) {
    return true;
  }

  const ownership = coverage.ownership_confidence;
  if (ownership !== null && ownership !== undefined && ownership < 70) {
    return true;
  }

  const confidence = coverage.confidence;
  return confidence !== null && confidence !== undefined && confidence < 70;
}

export function isCoverageLowOwnership(coverage: PolicyCoverageDetail): boolean {
  const ownership = coverage.ownership_confidence;
  return ownership !== null && ownership !== undefined && ownership < 70;
}

export function buildCoverageIntelligenceSummary(
  grouped: HealthPolicyGroupedView | null,
  flatCoverages: PolicyCoverageDetail[]
): PolicyCoverageIntelligenceSummary {
  const assigned = grouped
    ? grouped.people.reduce((sum, person) => sum + person.coverages.length, 0)
    : flatCoverages.filter((coverage) => Boolean(coverage.insured_person_name)).length;

  const unassigned = grouped?.unassignedCoverages.length ?? 0;
  const allCoverages = grouped
    ? [
        ...grouped.people.flatMap((person) => person.coverages),
        ...grouped.unassignedCoverages,
      ]
    : flatCoverages;

  const uncertain = allCoverages.filter(isCoverageUncertain).length;
  const lowOwnership = allCoverages.filter(isCoverageLowOwnership).length;
  const totalCoverages = allCoverages.length;

  const segmentCounts: Record<CoverageTier, number> = {
    base: 0,
    complementary: 0,
    other: 0,
  };

  for (const coverage of allCoverages) {
    segmentCounts[getCoverageTier(coverage)] += 1;
  }

  const segments: PolicyCoverageSegment[] = (
    ["base", "complementary", "other"] as CoverageTier[]
  )
    .map((tier) => ({
      tier,
      label: getCoverageTierLabel(tier),
      count: segmentCounts[tier],
    }))
    .filter((segment) => segment.count > 0);

  const completenessPercent =
    totalCoverages === 0
      ? null
      : Math.round(((totalCoverages - unassigned - uncertain) / totalCoverages) * 100);

  return {
    totalCoverages,
    assignedToPeople: assigned,
    unassigned,
    uncertain,
    lowOwnership,
    segments,
    completenessPercent,
  };
}

export function buildPolicyTimelineSteps(
  policy: UserPolicy,
  grouped: HealthPolicyGroupedView | null
): PolicyTimelineStep[] {
  const hasDocument = Boolean(policy.document);
  const hasExtraction =
    policy.source === "ai_draft" || policy.extractionConfidence !== null;
  const hasGrouping =
    (grouped?.people.length ?? 0) > 0 || (grouped?.unassignedCoverages.length ?? 0) > 0;
  const inReview = policy.requiresReview;
  const confirmed = !policy.requiresReview && policy.status === "active";

  return [
    {
      id: "uploaded",
      label: "Documento",
      description: hasDocument
        ? policy.document?.fileName ?? "PDF collegato"
        : "Nessun PDF collegato",
      state: hasDocument ? "complete" : "unavailable",
    },
    {
      id: "extracted",
      label: "Estrazione",
      description: hasExtraction
        ? policy.extractionConfidence !== null
          ? `Confidenza ${policy.extractionConfidence}%`
          : "Dati estratti dal PDF"
        : "Inserimento manuale",
      state: hasExtraction ? "complete" : hasDocument ? "pending" : "unavailable",
    },
    {
      id: "grouped",
      label: "Raggruppamento",
      description: hasGrouping
        ? `${grouped?.people.length ?? 0} persone · ${grouped?.unassignedCoverages.length ?? 0} da assegnare`
        : "Non applicabile o in preparazione",
      state: hasGrouping ? (grouped?.unassignedCoverages.length ? "current" : "complete") : "unavailable",
    },
    {
      id: "reviewed",
      label: "Revisione",
      description: inReview ? "Bozza da confermare" : "Revisione completata",
      state: inReview ? "current" : confirmed ? "complete" : hasExtraction ? "pending" : "unavailable",
    },
    {
      id: "confirmed",
      label: "Conferma",
      description: confirmed ? "Polizza verificata" : inReview ? "In attesa di conferma" : "Non confermata",
      state: confirmed ? "complete" : inReview ? "pending" : "unavailable",
    },
  ];
}

export function buildPolicyReviewCenterItems(input: {
  policy: UserPolicy;
  uncertainFields: PolicyFieldConfidence[];
  unassignedCount: number;
  warnings: string[];
  coverageSummary: PolicyCoverageIntelligenceSummary;
}): PolicyReviewCenterItem[] {
  const items: PolicyReviewCenterItem[] = [];

  if (input.policy.requiresReview) {
    items.push({
      id: "requires-review",
      title: "Bozza da confermare",
      description:
        "Verifica premio, persone assicurate e coperture prima di considerare i dati affidabili.",
      tone: "attention",
    });
  }

  if (input.uncertainFields.length > 0) {
    items.push({
      id: "uncertain-fields",
      title: `${input.uncertainFields.length} campi incerti`,
      description: "Campi con confidenza bassa nell'estrazione AI.",
      tone: "warning",
    });
  }

  if (input.unassignedCount > 0) {
    items.push({
      id: "unassigned",
      title: `${input.unassignedCount} coperture da assegnare`,
      description: "Collega ogni copertura alla persona assicurata corretta.",
      tone: "warning",
    });
  }

  if (input.coverageSummary.uncertain > 0) {
    items.push({
      id: "uncertain-coverages",
      title: `${input.coverageSummary.uncertain} coperture da verificare`,
      description: "Segnali di incertezza su premi o appartenenza.",
      tone: "warning",
    });
  }

  if (
    input.policy.extractionConfidence !== null &&
    input.policy.extractionConfidence < 75
  ) {
    items.push({
      id: "low-confidence",
      title: `Confidenza estrazione ${input.policy.extractionConfidence}%`,
      description: "Consigliata una revisione manuale dei dati principali.",
      tone: "attention",
    });
  }

  for (const warning of input.warnings.slice(0, 4)) {
    const informational =
      warning.includes("Premio gratuito indicato") ||
      warning.includes("importo di listino rilevato come riferimento") ||
      warning.includes("premio gratuito nel PDF");

    items.push({
      id: `warning-${warning.slice(0, 24)}`,
      title: informational ? "Nota premio" : "Avviso estrazione",
      description: warning,
      tone: informational ? "neutral" : "warning",
    });
  }

  if (items.length === 0 && !input.policy.requiresReview) {
    items.push({
      id: "verified",
      title: "Dati verificati",
      description: "Nessuna azione di revisione urgente rilevata su questa polizza.",
      tone: "success",
    });
  }

  return items;
}

export function formatCoveragePremiumLabel(coverage: PolicyCoverageDetail): string {
  return formatCoveragePremiumDisplay(coverage);
}

export function formatPersonPremium(
  amount: number | null | undefined
): string | null {
  if (amount === null || amount === undefined || !Number.isFinite(amount)) {
    return null;
  }

  return formatCHF(amount);
}

export function hasExtractionMetadataContent(metadata: PolicyExtractionMetadata): boolean {
  return Boolean(
    metadata.matched_keywords?.length ||
      metadata.inferred_sections?.length ||
      metadata.warnings?.length ||
      metadata.provider_aliases_matched?.length ||
      metadata.detected_languages?.length ||
      metadata.source_hints?.length
  );
}
