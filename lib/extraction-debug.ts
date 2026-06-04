import "server-only";

import type { PolicyDocumentExtractionResult } from "@/lib/document-analysis";
import { averageFieldConfidenceForDebug } from "@/lib/extraction-confidence";
import { getHealthPolicyGroupedView, hasHealthPolicyDetailData } from "@/lib/policy-health-grouping";
import type { PolicyDetails } from "@/lib/types";
import { isDevExtractionSummaryEnabled } from "@/lib/extraction-dev";

function countAssignedCoverages(details: PolicyDetails) {
  return (details.coverages ?? []).filter(
    (coverage) =>
      Boolean(coverage.insured_person_name?.trim()) ||
      Boolean(coverage.insured_number?.trim())
  ).length;
}

function averageOwnershipConfidence(details: PolicyDetails) {
  const values = (details.coverages ?? [])
    .map((coverage) => coverage.ownership_confidence)
    .filter((value): value is number => value !== null && value !== undefined);

  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function logExtractionSummaryDebug(input: {
  documentId: string;
  modelUsed?: string;
  fallbackUsed?: boolean;
  result: PolicyDocumentExtractionResult;
}) {
  if (!isDevExtractionSummaryEnabled()) {
    return;
  }

  const { draft } = input.result;
  const details = draft.details;
  const grouped =
    draft.policyType === "health" && hasHealthPolicyDetailData(details)
      ? getHealthPolicyGroupedView(details, draft.premiumAmount, input.documentId)
      : null;

  const summary = {
    documentId: input.documentId,
    modelUsed: input.modelUsed ?? "unknown",
    fallbackUsed: input.fallbackUsed ?? false,
    extractionConfidence: draft.extractionConfidence,
    providerPresent: Boolean(draft.provider?.trim()),
    policyNumberPresent: Boolean(draft.policyNumber?.trim()),
    peopleCount: details.insured_people?.length ?? 0,
    coverageCount: details.coverages?.length ?? 0,
    productCount: details.products?.length ?? 0,
    complementaryProductCount: details.complementary_products?.length ?? 0,
    assignedCoverageCount: countAssignedCoverages(details),
    unassignedCoverageCount: grouped?.unassignedCoverages.length ?? null,
    groupedPeopleCount: grouped?.people.length ?? null,
    averageOwnershipConfidence: averageOwnershipConfidence(details),
    fieldConfidenceAverage: averageFieldConfidenceForDebug(details.field_confidence),
  };

  console.info("[atlas:extraction:summary]", summary);
}
