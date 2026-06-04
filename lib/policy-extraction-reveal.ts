import type { PolicyCoverageIntelligenceSummary } from "@/lib/policy-detail-display";
import type { UserPolicy } from "@/lib/types";
import { formatCHF } from "@/lib/utils";

export type ExtractionConfidenceTier = "high" | "medium" | "low" | "unknown";

export type ExtractionHighlightTone = "success" | "warning" | "neutral";

export type ExtractionHighlight = {
  id: string;
  label: string;
  detail: string;
  tone: ExtractionHighlightTone;
};

export type ExtractionSummaryMetric = {
  id: string;
  label: string;
  value: string;
  subtext: string;
  emphasis?: "default" | "success" | "warning" | "muted";
};

export function getExtractionConfidenceTier(
  confidence: number | null
): ExtractionConfidenceTier {
  if (confidence === null || !Number.isFinite(confidence)) {
    return "unknown";
  }
  if (confidence >= 80) {
    return "high";
  }
  if (confidence >= 60) {
    return "medium";
  }
  return "low";
}

export function getExtractionConfidenceLabel(tier: ExtractionConfidenceTier): string {
  switch (tier) {
    case "high":
      return "Alta affidabilità";
    case "medium":
      return "Verifica consigliata";
    case "low":
      return "Dati parziali";
    default:
      return "Da verificare";
  }
}

export function getExtractionConfidenceDescription(
  tier: ExtractionConfidenceTier,
  confidence: number | null
): string {
  const suffix =
    confidence !== null && Number.isFinite(confidence)
      ? ` · ${Math.round(confidence)}% estrazione`
      : "";

  switch (tier) {
    case "high":
      return `I campi principali sono coerenti con il PDF${suffix}.`;
    case "medium":
      return `Alcuni campi meritano una revisione manuale${suffix}.`;
    case "low":
      return `Atlas ha bisogno di verifica manuale sui dati principali${suffix}.`;
    default:
      return "Confidenza non calcolata per questa scheda.";
  }
}

export function countMissingKeyFields(policy: UserPolicy): number {
  let missing = 0;

  if (!policy.provider?.trim()) {
    missing += 1;
  }
  if (!policy.policyNumber?.trim()) {
    missing += 1;
  }
  if (policy.premiumAmount === null) {
    missing += 1;
  }

  return missing;
}

export function shouldShowExtractionReveal(policy: UserPolicy): boolean {
  return (
    policy.source === "ai_draft" ||
    policy.requiresReview ||
    policy.extractionConfidence !== null
  );
}

export function isPartialExtraction(input: {
  policy: UserPolicy;
  uncertainFieldCount: number;
  coverageSummary: PolicyCoverageIntelligenceSummary;
}): boolean {
  const { policy, uncertainFieldCount, coverageSummary } = input;
  const confidence = policy.extractionConfidence;

  return (
    policy.requiresReview ||
    uncertainFieldCount > 0 ||
    coverageSummary.unassigned > 0 ||
    coverageSummary.uncertain > 0 ||
    countMissingKeyFields(policy) >= 2 ||
    (confidence !== null && confidence < 75)
  );
}

export function buildExtractionSummaryMetrics(input: {
  policy: UserPolicy;
  insuredCount: number;
  coverageCount: number;
  completenessPercent: number | null;
}): ExtractionSummaryMetric[] {
  const { policy, insuredCount, coverageCount, completenessPercent } = input;
  const confidenceTier = getExtractionConfidenceTier(policy.extractionConfidence);

  const providerValue = policy.provider?.trim()
    ? policy.provider.trim()
    : "Non rilevato";

  const premiumValue =
    policy.premiumAmount !== null
      ? formatCHF(policy.premiumAmount)
      : "Non rilevato";

  const renewalValue = policy.renewalDate
    ? new Date(`${policy.renewalDate}T12:00:00`).toLocaleDateString("it-CH")
    : "Non rilevato";

  return [
    {
      id: "provider",
      label: "Compagnia",
      value: providerValue,
      subtext: policy.provider?.trim() ? "Rilevata nel PDF" : "Da verificare",
      emphasis: policy.provider?.trim() ? "default" : "warning",
    },
    {
      id: "people",
      label: "Persone",
      value: insuredCount > 0 ? String(insuredCount) : "—",
      subtext:
        insuredCount > 0
          ? insuredCount === 1
            ? "assicurata trovata"
            : "assicurate trovate"
          : "Non rilevate",
      emphasis: insuredCount > 0 ? "success" : "muted",
    },
    {
      id: "coverages",
      label: "Coperture",
      value: coverageCount > 0 ? String(coverageCount) : "—",
      subtext: coverageCount > 0 ? "identificate" : "Non rilevate",
      emphasis: coverageCount > 0 ? "success" : "muted",
    },
    {
      id: "premium",
      label: "Premio",
      value: premiumValue,
      subtext:
        policy.premiumAmount !== null
          ? `Frequenza ${policy.premiumFrequency}`
          : "Non rilevato",
      emphasis: policy.premiumAmount !== null ? "default" : "warning",
    },
    {
      id: "renewal",
      label: "Rinnovo",
      value: renewalValue,
      subtext: policy.renewalDate ? "Data rilevata" : "Non rilevata",
      emphasis: policy.renewalDate ? "default" : "muted",
    },
    {
      id: "completeness",
      label: "Completezza",
      value:
        completenessPercent !== null ? `${completenessPercent}%` : "—",
      subtext:
        completenessPercent !== null
          ? "assegnazioni e certezza"
          : "In preparazione",
      emphasis:
        completenessPercent !== null && completenessPercent >= 70
          ? "success"
          : completenessPercent !== null
            ? "warning"
            : "muted",
    },
    {
      id: "confidence",
      label: "Affidabilità",
      value: getExtractionConfidenceLabel(confidenceTier),
      subtext:
        policy.extractionConfidence !== null
          ? `${Math.round(policy.extractionConfidence)}% medio`
          : "Non disponibile",
      emphasis:
        confidenceTier === "high"
          ? "success"
          : confidenceTier === "medium"
            ? "warning"
            : "muted",
    },
  ];
}

export function buildExtractionHighlights(input: {
  policy: UserPolicy;
  insuredCount: number;
  coverageCount: number;
  coverageSummary: PolicyCoverageIntelligenceSummary;
  uncertainFieldCount: number;
}): ExtractionHighlight[] {
  const { policy, insuredCount, coverageCount, coverageSummary, uncertainFieldCount } =
    input;
  const highlights: ExtractionHighlight[] = [];
  const missingFields = countMissingKeyFields(policy);

  if (policy.provider?.trim()) {
    highlights.push({
      id: "provider",
      label: "Compagnia rilevata",
      detail: policy.provider.trim(),
      tone: "success",
    });
  }

  if (insuredCount > 0) {
    highlights.push({
      id: "people",
      label:
        insuredCount === 1 ? "1 persona assicurata" : `${insuredCount} persone assicurate`,
      detail: "Estratte dal documento",
      tone: "success",
    });
  }

  if (coverageCount > 0) {
    highlights.push({
      id: "coverages",
      label:
        coverageCount === 1 ? "1 copertura" : `${coverageCount} coperture`,
      detail: "Strutturate da Atlas",
      tone: "success",
    });
  }

  if (policy.premiumAmount !== null) {
    highlights.push({
      id: "premium",
      label: "Premio identificato",
      detail: formatCHF(policy.premiumAmount),
      tone: "success",
    });
  }

  if (policy.deductible !== null) {
    highlights.push({
      id: "deductible",
      label: "Franchigia trovata",
      detail: formatCHF(policy.deductible),
      tone: "neutral",
    });
  }

  if (policy.renewalDate) {
    highlights.push({
      id: "renewal",
      label: "Rinnovo rilevato",
      detail: new Date(`${policy.renewalDate}T12:00:00`).toLocaleDateString(
        "it-CH"
      ),
      tone: "neutral",
    });
  }

  if (policy.document) {
    highlights.push({
      id: "document",
      label: "Documento collegato",
      detail: policy.document.fileName,
      tone: "neutral",
    });
  }

  const reviewCount =
    uncertainFieldCount +
    coverageSummary.unassigned +
    coverageSummary.uncertain +
    missingFields;

  if (reviewCount > 0) {
    highlights.push({
      id: "review",
      label: "Dati da verificare",
      detail: `${reviewCount} elemento${reviewCount === 1 ? "" : "i"} richiede attenzione`,
      tone: "warning",
    });
  }

  return highlights;
}
