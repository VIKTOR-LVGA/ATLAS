import { getCoverageNetPremium } from "@/lib/coverage-premium";
import { formatCHF } from "@/lib/utils";
import type {
  PolicyCoverageDetail,
  PolicyCoverageDiscount,
  PolicyDetails,
  PolicyProductDetail,
} from "@/lib/types";

const FREE_PREMIUM_PATTERN =
  /\b(premio\s+gratuito|gratuit[oa]?|free\s+premium|ohne\s+pr[aä]mie|sans\s+prime|sconto\s*100\s*%|rabatt\s*100\s*%|100\s*%\s*(sconto|rabatt|discount)|inclus[oa]|inbegriffen|included|nicht\s+zu\s+bezahlen)\b/i;

const ZERO_TOTAL_PATTERN =
  /\b(totale\s*0[,.]00|total\s*0[,.]00|da\s+pagare\s*0[,.]00|zu\s+zahlen\s*0[,.]00|effettivo\s*0[,.]00|premio\s+effettivo\s*0)\b/i;

const AMBIGUOUS_PREMIUM_WARNING_PATTERN =
  /\b(appare\s+sia|sia\s+un\s+importo|ambig|contraditt|contradditt|incertezza.*premio|premio.*incert|listino.*gratuit|gratuit.*chf|chf.*gratuit)\b/i;

const EXPLICIT_FREE_NOTE = "Premio gratuito indicato nel PDF.";

export type FreePremiumStatus = "explicit_free" | "ambiguous" | "none";

function normalizeText(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim();
}

function collectCoverageText(coverage: PolicyCoverageDetail) {
  const discountText = (coverage.discounts ?? [])
    .map((item) => [item.label, item.notes].filter(Boolean).join(" "))
    .join(" ");

  return [coverage.name, coverage.notes, discountText].filter(Boolean).join(" ");
}

export function detectFreePremiumStatus(
  coverage: Pick<
    PolicyCoverageDetail,
    "name" | "notes" | "discounts" | "premium_gross" | "premium_final" | "premium_amount"
  >
): FreePremiumStatus {
  const text = collectCoverageText(coverage as PolicyCoverageDetail);
  const net =
    coverage.premium_final ?? coverage.premium_amount ?? null;
  const gross = coverage.premium_gross ?? null;

  const explicitText = FREE_PREMIUM_PATTERN.test(text) || ZERO_TOTAL_PATTERN.test(text);
  const explicitZero =
    net !== null && net !== undefined && Math.abs(net) < 0.005;
  const listWithZero =
    gross !== null &&
    gross > 0 &&
    explicitZero &&
    (explicitText || FREE_PREMIUM_PATTERN.test(text));

  if (explicitText || listWithZero) {
    return "explicit_free";
  }

  if (
    gross !== null &&
    gross > 0 &&
    net !== null &&
    net > 0 &&
    /gratuit|gratuito|free|sconto|rabatt|discount/i.test(text) &&
    !FREE_PREMIUM_PATTERN.test(text)
  ) {
    return "ambiguous";
  }

  return "none";
}

export function isExplicitFreePremiumCoverage(coverage: PolicyCoverageDetail) {
  return detectFreePremiumStatus(coverage) === "explicit_free";
}

function buildFreePremiumNote(listAmount: number | null) {
  if (listAmount !== null && listAmount > 0) {
    return `${EXPLICIT_FREE_NOTE} Listino ${formatCHF(listAmount)}, premio effettivo CHF 0.`;
  }

  return EXPLICIT_FREE_NOTE;
}

function mergeNotes(existing: string | null | undefined, addition: string) {
  const current = normalizeText(existing);
  if (!current) {
    return addition;
  }

  if (current.includes(addition) || current.includes(EXPLICIT_FREE_NOTE)) {
    return current;
  }

  return `${current} ${addition}`;
}

function ensureFreeDiscount(discounts: PolicyCoverageDiscount[] | undefined) {
  const list = [...(discounts ?? [])];
  const hasFreeLabel = list.some((item) =>
    FREE_PREMIUM_PATTERN.test(`${item.label ?? ""} ${item.notes ?? ""}`)
  );

  if (!hasFreeLabel) {
    list.push({
      label: "Premio gratuito",
      amount: null,
      notes: EXPLICIT_FREE_NOTE,
    });
  }

  return list.slice(0, 12);
}

export function normalizeCoverageFreePremium(
  coverage: PolicyCoverageDetail
): PolicyCoverageDetail {
  const status = detectFreePremiumStatus(coverage);

  if (status === "ambiguous") {
    return {
      ...coverage,
      uncertain: coverage.uncertain ?? true,
    };
  }

  if (status !== "explicit_free") {
    return coverage;
  }

  const currentNet = getCoverageNetPremium(coverage);
  const listAmount =
    coverage.premium_gross ??
    (currentNet !== null && currentNet > 0 ? currentNet : null);

  return {
    ...coverage,
    premium_gross: listAmount,
    premium_final: 0,
    premium_amount: 0,
    notes: mergeNotes(coverage.notes, buildFreePremiumNote(listAmount)),
    discounts: ensureFreeDiscount(coverage.discounts),
    uncertain: false,
  };
}

function normalizeProductFreePremium(product: PolicyProductDetail): PolicyProductDetail {
  const asCoverage: PolicyCoverageDetail = {
    name: product.name,
    coverage_type: product.coverage_type,
    premium_gross: product.premium_gross,
    premium_amount: product.premium_amount,
    premium_final: product.premium_final,
    discounts: product.discounts,
    notes: product.notes,
    uncertain: product.uncertain,
  };

  const normalized = normalizeCoverageFreePremium(asCoverage);

  return {
    ...product,
    premium_gross: normalized.premium_gross,
    premium_amount: normalized.premium_amount,
    premium_final: normalized.premium_final,
    notes: normalized.notes,
    discounts: normalized.discounts,
    uncertain: normalized.uncertain,
  };
}

export function normalizePolicyDetailsFreePremiums(
  details: PolicyDetails
): PolicyDetails {
  return {
    ...details,
    coverages: (details.coverages ?? []).map(normalizeCoverageFreePremium),
    products: (details.products ?? []).map(normalizeProductFreePremium),
    complementary_products: (details.complementary_products ?? []).map(
      normalizeProductFreePremium
    ),
    insured_people: (details.insured_people ?? []).map((person) => ({
      ...person,
      coverages: (person.coverages ?? []).map(normalizeCoverageFreePremium),
    })),
  };
}

export function refineExtractionPremiumWarnings(
  warnings: string[],
  details: PolicyDetails
): string[] {
  const coverages = [
    ...(details.coverages ?? []),
    ...(details.products ?? []).map((product) => ({
      name: product.name,
      notes: product.notes,
      discounts: product.discounts,
      premium_gross: product.premium_gross,
      premium_final: product.premium_final,
      premium_amount: product.premium_amount,
    })),
  ] as PolicyCoverageDetail[];

  const refined: string[] = [];

  for (const warning of warnings) {
    const normalizedWarning = normalizeText(warning);
    if (!normalizedWarning) {
      continue;
    }

    const matchedCoverage = coverages.find(
      (coverage) =>
        coverage.name &&
        normalizedWarning.toLowerCase().includes(coverage.name.toLowerCase())
    );

    if (
      matchedCoverage &&
      detectFreePremiumStatus(matchedCoverage) === "explicit_free" &&
      AMBIGUOUS_PREMIUM_WARNING_PATTERN.test(normalizedWarning)
    ) {
      const replacement = `Premio gratuito indicato per «${matchedCoverage.name}»; importo di listino rilevato come riferimento.`;
      if (!refined.includes(replacement)) {
        refined.push(replacement);
      }
      continue;
    }

    if (
      AMBIGUOUS_PREMIUM_WARNING_PATTERN.test(normalizedWarning) &&
      coverages.some((coverage) => detectFreePremiumStatus(coverage) === "explicit_free")
    ) {
      const replacement =
        "Una o più coperture indicano premio gratuito nel PDF; gli importi di listino sono conservati come riferimento.";
      if (!refined.includes(replacement)) {
        refined.push(replacement);
      }
      continue;
    }

    refined.push(normalizedWarning);
  }

  return [...new Set(refined)].slice(0, 12);
}

export function formatCoveragePremiumDisplay(coverage: PolicyCoverageDetail): string {
  const status = detectFreePremiumStatus(coverage);
  const net = getCoverageNetPremium(coverage);
  const gross = coverage.premium_gross ?? null;

  if (status === "explicit_free") {
    if (gross !== null && gross > 0) {
      return `Listino ${formatCHF(gross)} · effettivo CHF 0`;
    }

    return "CHF 0 · premio gratuito";
  }

  if (net === null || net === undefined) {
    return "Non disponibile";
  }

  if (
    gross !== null &&
    gross > 0 &&
    Math.abs(gross - net) > 0.01
  ) {
    return `${formatCHF(net)} (lordo ${formatCHF(gross)})`;
  }

  return formatCHF(net);
}

export function getCoveragePremiumSubtitle(coverage: PolicyCoverageDetail): string | null {
  if (!isExplicitFreePremiumCoverage(coverage)) {
    return null;
  }

  return EXPLICIT_FREE_NOTE;
}

export function isInformationalPremiumWarning(warning: string) {
  const normalized = normalizeText(warning);
  return (
    normalized.includes("Premio gratuito indicato") ||
    normalized.includes("importo di listino rilevato come riferimento") ||
    normalized.includes("premio gratuito nel PDF")
  );
}
