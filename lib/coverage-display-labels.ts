import { swissPolicySubtypeLabels, isSwissPolicySubtype } from "@/lib/swiss-insurance-normalization";
import type { PolicyCoverageDetail, PolicyProductDetail } from "@/lib/types";

const COVERAGE_TYPE_ALIASES: Record<string, keyof typeof swissPolicySubtypeLabels> = {
  lamal: "lamal_base",
  lamal_base: "lamal_base",
  base: "lamal_base",
  kvg: "lamal_base",
  lca: "lca_complementary",
  lca_complementary: "lca_complementary",
  complement: "lca_complementary",
  complementary: "lca_complementary",
  complementare: "lca_complementary",
  hospital: "hospital",
  ospedaliera: "hospital",
  spital: "hospital",
  accident: "accident",
  infortuni: "accident",
  infortunio: "accident",
  dental: "dental",
  dentale: "dental",
  travel: "travel",
  viaggio: "travel",
  legal: "legal_protection",
  legal_protection: "legal_protection",
  telmed: "other",
  hmo: "other",
  ambulatory: "other",
  ambulatoriale: "other",
  outpatient: "other",
};

const INTERNAL_SLUG_PATTERN =
  /^(lamal_base|lca_complementary|hospital|accident|dental|travel|legal_protection|lamal|lca|other)$/i;

function normalizeToken(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

function isInternalSlug(value: string | null | undefined) {
  if (!value?.trim()) {
    return false;
  }

  return INTERNAL_SLUG_PATTERN.test(normalizeToken(value));
}

function resolveSubtypeLabel(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  const token = normalizeToken(value);

  if (isSwissPolicySubtype(token)) {
    return swissPolicySubtypeLabels[token];
  }

  const alias = COVERAGE_TYPE_ALIASES[token];
  return alias ? swissPolicySubtypeLabels[alias] : null;
}

function pickHumanName(name: string | null | undefined) {
  const trimmed = name?.trim();
  if (!trimmed || isInternalSlug(trimmed)) {
    return null;
  }

  return trimmed;
}

/**
 * User-facing label for a coverage/product line (storage may keep internal types).
 */
export function formatCoverageDisplayLabel(
  coverage: Pick<
    PolicyCoverageDetail,
    "name" | "category_label" | "coverage_type" | "notes"
  >
): string {
  const humanName = pickHumanName(coverage.name);
  if (humanName) {
    return humanName;
  }

  const categoryLabel = coverage.category_label?.trim();
  if (categoryLabel && !isInternalSlug(categoryLabel)) {
    return categoryLabel;
  }

  const mapped = resolveSubtypeLabel(coverage.coverage_type ?? categoryLabel);
  if (mapped) {
    return mapped;
  }

  if (categoryLabel) {
    return categoryLabel;
  }

  const typeToken = coverage.coverage_type?.trim();
  if (typeToken && !isInternalSlug(typeToken)) {
    return typeToken;
  }

  return "Copertura";
}

export function formatProductDisplayLabel(product: Pick<PolicyProductDetail, "name" | "coverage_type">) {
  return formatCoverageDisplayLabel({
    name: product.name,
    category_label: product.coverage_type,
    coverage_type: product.coverage_type,
    notes: null,
  });
}

export function formatCoverageDisplaySubtitle(
  coverage: Pick<PolicyCoverageDetail, "name" | "category_label" | "coverage_type">
): string | null {
  const primary = formatCoverageDisplayLabel(coverage);
  const tier = resolveSubtypeLabel(coverage.coverage_type ?? coverage.category_label);

  if (!tier || tier === primary) {
    return null;
  }

  if (pickHumanName(coverage.name)) {
    return tier;
  }

  return null;
}
