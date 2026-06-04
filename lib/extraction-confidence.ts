import "server-only";

import type { PolicyExtractionDraft } from "@/lib/document-analysis";
import type { PolicyDetails, PolicyFieldConfidenceMap } from "@/lib/types";

function getDetailsRecord(details: PolicyDetails | null | undefined) {
  return details ?? {};
}

function averageFieldConfidence(map: PolicyFieldConfidenceMap | undefined) {
  if (!map) {
    return null;
  }

  const values = Object.values(map)
    .map((item) => item?.confidence)
    .filter((value): value is number => value !== null && value !== undefined);

  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function averageFieldConfidenceForDebug(map: PolicyFieldConfidenceMap | undefined) {
  return averageFieldConfidence(map);
}

/**
 * Floor from structured fields actually present in the draft (not inflated).
 */
export function computeStructuralConfidenceFloor(
  draft: Pick<
    PolicyExtractionDraft,
    "provider" | "policyNumber" | "premiumAmount" | "policyType" | "details"
  >
): number | null {
  const details = getDetailsRecord(draft.details);
  const insuredPeople = details.insured_people?.length ?? 0;
  const coverages = details.coverages?.length ?? 0;
  const products =
    (details.products?.length ?? 0) + (details.complementary_products?.length ?? 0);

  let score = 0;

  if (draft.provider?.trim()) {
    score += 12;
  }
  if (draft.policyNumber?.trim()) {
    score += 8;
  }
  if (draft.premiumAmount !== null && draft.premiumAmount !== undefined) {
    score += 14;
  }
  if (draft.policyType && draft.policyType !== "other") {
    score += 8;
  }
  if (insuredPeople >= 1) {
    score += 10;
  }
  if (insuredPeople >= 2) {
    score += 6;
  }
  if (coverages >= 2) {
    score += 12;
  }
  if (coverages >= 5) {
    score += 8;
  }
  if (products >= 1) {
    score += 6;
  }

  const assignedCoverages =
    details.coverages?.filter(
      (coverage) =>
        Boolean(coverage.insured_person_name?.trim()) ||
        Boolean(coverage.insured_number?.trim())
    ).length ?? 0;

  if (assignedCoverages >= 2) {
    score += 10;
  }

  const hasStrongCore =
    Boolean(draft.provider?.trim()) &&
    Boolean(draft.policyNumber?.trim()) &&
    draft.premiumAmount !== null &&
    insuredPeople >= 1 &&
    coverages >= 3 &&
    assignedCoverages >= 2;

  if (hasStrongCore) {
    score = Math.max(score, 68);
  }

  return score > 0 ? Math.min(78, score) : null;
}

function hasStrongExtractionEvidence(
  draft: Pick<
    PolicyExtractionDraft,
    "provider" | "policyNumber" | "premiumAmount" | "details"
  >
) {
  const details = getDetailsRecord(draft.details);
  const assignedCoverages =
    details.coverages?.filter(
      (coverage) =>
        Boolean(coverage.insured_person_name?.trim()) &&
        Boolean(coverage.insured_number?.trim())
    ).length ?? 0;

  return (
    Boolean(draft.provider?.trim()) &&
    Boolean(draft.policyNumber?.trim()) &&
    draft.premiumAmount !== null &&
    (details.insured_people?.length ?? 0) >= 1 &&
    (details.coverages?.length ?? 0) >= 3 &&
    assignedCoverages >= 2
  );
}

/**
 * Reconcile model-reported confidence with field/structure evidence.
 * Avoids nonsensical ~1% when core policy data was extracted.
 */
export function resolveExtractionConfidence(
  modelConfidence: number | null,
  fieldConfidence: PolicyFieldConfidenceMap | undefined,
  draft: Pick<
    PolicyExtractionDraft,
    "provider" | "policyNumber" | "premiumAmount" | "policyType" | "details"
  >
): number | null {
  const fieldAverage = averageFieldConfidence(fieldConfidence);
  const structuralFloor = computeStructuralConfidenceFloor(draft);
  const evidenceScores = [fieldAverage, structuralFloor].filter(
    (value): value is number => value !== null && value !== undefined
  );
  const evidencePeak =
    evidenceScores.length > 0 ? Math.max(...evidenceScores) : null;

  if (modelConfidence === null) {
    return evidencePeak;
  }

  if (
    evidencePeak !== null &&
    modelConfidence < 25 &&
    evidencePeak >= 40
  ) {
    return Math.min(
      85,
      Math.round(Math.max(modelConfidence, evidencePeak * 0.72))
    );
  }

  if (
    evidencePeak !== null &&
    modelConfidence < 50 &&
    evidencePeak - modelConfidence >= 28
  ) {
    return Math.min(
      85,
      Math.round((modelConfidence + evidencePeak) / 2)
    );
  }

  if (
    hasStrongExtractionEvidence(draft) &&
    evidencePeak !== null &&
    modelConfidence >= 45 &&
    modelConfidence < 70 &&
    evidencePeak >= 58
  ) {
    const blended = Math.round(modelConfidence * 0.45 + evidencePeak * 0.55);
    return Math.min(85, Math.max(modelConfidence, blended));
  }

  if (modelConfidence >= 88) {
    return Math.min(100, modelConfidence);
  }

  if (modelConfidence >= 70) {
    return Math.min(85, modelConfidence);
  }

  return modelConfidence;
}
