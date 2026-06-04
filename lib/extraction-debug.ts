import "server-only";

import type { PolicyDocumentExtractionResult } from "@/lib/document-analysis";
import { averageFieldConfidenceForDebug } from "@/lib/extraction-confidence";
import {
  getHealthPolicyGroupedView,
  getPolicyCoveragesForDisplay,
  hasHealthPolicyDetailData,
  semanticCoverageKey,
} from "@/lib/policy-health-grouping";
import type { PolicyCoverageDetail, PolicyDetails } from "@/lib/types";
import { isDevExtractionSummaryEnabled } from "@/lib/extraction-dev";

function countNestedPersonCoverages(details: PolicyDetails) {
  return (details.insured_people ?? []).reduce(
    (sum, person) => sum + (person.coverages?.length ?? 0),
    0
  );
}

function collectStructuralCoverageLines(
  details: PolicyDetails
): PolicyCoverageDetail[] {
  return [
    ...(details.coverages ?? []),
    ...(details.insured_people ?? []).flatMap((person) => person.coverages ?? []),
  ];
}

function countUniqueCoverageLines(lines: PolicyCoverageDetail[]) {
  const seen = new Set<string>();
  let count = 0;

  for (const line of lines) {
    const key = semanticCoverageKey(line);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    count += 1;
  }

  return count;
}

function countAssignedCoverages(lines: PolicyCoverageDetail[]) {
  return lines.filter(
    (coverage) =>
      Boolean(coverage.insured_person_name?.trim()) ||
      Boolean(coverage.insured_number?.trim())
  ).length;
}

function averageOwnershipConfidence(lines: PolicyCoverageDetail[]) {
  const values = lines
    .map((coverage) => coverage.ownership_confidence)
    .filter((value): value is number => value !== null && value !== undefined);

  if (values.length === 0) {
    return null;
  }

  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function countGroupedAssignedCoverages(
  grouped: ReturnType<typeof getHealthPolicyGroupedView> | null
) {
  if (!grouped) {
    return null;
  }

  return grouped.people.reduce((sum, person) => sum + person.coverages.length, 0);
}

function countTotalDisplayCoverages(
  details: PolicyDetails,
  grouped: ReturnType<typeof getHealthPolicyGroupedView> | null
) {
  if (grouped) {
    const assigned = countGroupedAssignedCoverages(grouped) ?? 0;
    return assigned + grouped.unassignedCoverages.length;
  }

  const displayLines = [
    ...getPolicyCoveragesForDisplay(details),
    ...(details.insured_people ?? []).flatMap((person) => person.coverages ?? []),
  ];

  return countUniqueCoverageLines(displayLines);
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
  const structuralLines = collectStructuralCoverageLines(details);
  const grouped =
    draft.policyType === "health" && hasHealthPolicyDetailData(details)
      ? getHealthPolicyGroupedView(details, draft.premiumAmount, input.documentId)
      : null;

  const topLevelCoverageCount = details.coverages?.length ?? 0;
  const nestedPersonCoverageCount = countNestedPersonCoverages(details);
  const groupedAssignedCoverageCount = countGroupedAssignedCoverages(grouped);
  const totalDisplayCoverageCount = countTotalDisplayCoverages(details, grouped);

  const summary = {
    documentId: input.documentId,
    modelUsed: input.modelUsed ?? "unknown",
    fallbackUsed: input.fallbackUsed ?? false,
    extractionConfidence: draft.extractionConfidence,
    providerPresent: Boolean(draft.provider?.trim()),
    policyNumberPresent: Boolean(draft.policyNumber?.trim()),
    peopleCount: details.insured_people?.length ?? 0,
    topLevelCoverageCount,
    nestedPersonCoverageCount,
    productCount: details.products?.length ?? 0,
    complementaryProductCount: details.complementary_products?.length ?? 0,
    coverageCount: totalDisplayCoverageCount,
    totalDisplayCoverageCount,
    assignedCoverageCount: countAssignedCoverages(structuralLines),
    groupedAssignedCoverageCount,
    unassignedCoverageCount: grouped?.unassignedCoverages.length ?? null,
    groupedPeopleCount: grouped?.people.length ?? null,
    averageOwnershipConfidence: averageOwnershipConfidence(structuralLines),
    fieldConfidenceAverage: averageFieldConfidenceForDebug(details.field_confidence),
  };

  console.info("[atlas:extraction:summary]", summary);
}
