import "server-only";

import type { PolicyDetails } from "@/lib/types";

const STRONG_OWNERSHIP_SIGNAL_CONFIDENCE = 72;
const PRUDENT_OWNERSHIP_CAP = 78;

/**
 * Modest lift for flat coverages[] when assignment evidence is strong (name + number).
 * Does not override low-confidence unassigned lines or weak applies_to-only rows.
 */
export function syncPrudentAssignedCoverageOwnership(
  details: PolicyDetails
): PolicyDetails {
  const coverages = details.coverages ?? [];
  if (coverages.length === 0) {
    return details;
  }

  const synced = coverages.map((coverage) => {
    const hasPersonLink =
      Boolean(coverage.insured_person_name?.trim()) &&
      Boolean(coverage.insured_number?.trim());

    if (!hasPersonLink || coverage.uncertain) {
      return coverage;
    }

    const ownership = coverage.ownership_confidence;
    if (ownership === null || ownership === undefined) {
      return coverage;
    }

    if (ownership >= STRONG_OWNERSHIP_SIGNAL_CONFIDENCE) {
      return coverage;
    }

    if (ownership < 55) {
      return coverage;
    }

    const lifted = Math.min(
      PRUDENT_OWNERSHIP_CAP,
      Math.max(ownership, STRONG_OWNERSHIP_SIGNAL_CONFIDENCE)
    );

    if (lifted === ownership) {
      return coverage;
    }

    return {
      ...coverage,
      ownership_confidence: lifted,
    };
  });

  return {
    ...details,
    coverages: synced,
  };
}

export function syncInsuredPeopleCoverageOwnership(
  details: PolicyDetails
): PolicyDetails {
  const people = details.insured_people ?? [];
  if (people.length === 0) {
    return details;
  }

  return {
    ...details,
    insured_people: people.map((person) => ({
      ...person,
      coverages: (person.coverages ?? []).map((coverage) => {
        const synced = syncPrudentAssignedCoverageOwnership({
          coverages: [coverage],
        }).coverages?.[0];

        return synced ?? coverage;
      }),
    })),
  };
}
