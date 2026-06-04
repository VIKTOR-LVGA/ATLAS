import "server-only";

import { cache } from "react";
import {
  computeDashboardIntelligence,
  type DashboardPortfolioKpis,
} from "@/lib/dashboard-intelligence";
import {
  getExtractionConfidenceLabel,
  getExtractionConfidenceTier,
} from "@/lib/policy-extraction-reveal";
import {
  computePortfolioProgression,
  type CompletenessMetric,
  type PortfolioProgression,
} from "@/lib/portfolio-progression";
import {
  getPolicyCoverages,
  getPolicyTypeLabel,
  policyTypeLabels,
  typedPolicyTypes,
} from "@/lib/policy-types";
import { getCurrentUserDocuments } from "@/lib/documents";
import { getCurrentUserPolicies } from "@/lib/policies";
import type { TypedPolicyType, UserDocument, UserPolicy } from "@/lib/types";

export const MARKET_MIN_CONFIRMED_POLICIES = 3;
const TARGET_CATEGORY_DIVERSITY = 3;
const EXTRACTION_READINESS_THRESHOLD = 70;

export type MarketReadinessLabel =
  | "not_ready"
  | "preparing"
  | "almost_ready"
  | "comparison_ready";

export type MarketReadinessBlocker = {
  id: string;
  title: string;
  description: string;
  progressPercent: number | null;
  progressDetail: string;
  ctaLabel: string;
  ctaHref: string;
  priority: "high" | "medium";
};

export type MarketUnlockStep = {
  id: string;
  label: string;
  done: boolean;
  detail: string;
};

export type MarketOverviewSignal = {
  id: string;
  label: string;
  value: string;
  subtext: string;
  available: boolean;
};

export type MarketCategorySlot = {
  type: TypedPolicyType;
  label: string;
  detected: boolean;
  policyCount: number;
  comparisonReady: boolean;
  readinessDetail: string;
};

export type MarketFutureModule = {
  id: string;
  label: string;
  description: string;
  requirement: string;
};

export type MarketReadinessScore = {
  percent: number;
  label: MarketReadinessLabel;
  labelText: string;
  headline: string;
  subheadline: string;
  blockers: MarketReadinessBlocker[];
  unlockSteps: MarketUnlockStep[];
};

export type MarketIntelligence = {
  readiness: MarketReadinessScore;
  overview: MarketOverviewSignal[];
  categories: MarketCategorySlot[];
  futureModules: MarketFutureModule[];
  progression: PortfolioProgression;
  kpis: DashboardPortfolioKpis;
  hasPortfolio: boolean;
  hasInsufficientData: boolean;
  comparisonEligibleCount: number;
  providersIdentified: string[];
  missingCategoryCount: number;
};

const readinessLabelText: Record<MarketReadinessLabel, string> = {
  not_ready: "Non ancora pronto",
  preparing: "In preparazione",
  almost_ready: "Da completare",
  comparison_ready: "Dati idonei (benchmark in preparazione)",
};

function metricPercent(
  completeness: CompletenessMetric[],
  id: string
): number | null {
  return completeness.find((metric) => metric.id === id)?.percent ?? null;
}

function metricStatus(
  completeness: CompletenessMetric[],
  id: string
): CompletenessMetric["status"] {
  return completeness.find((metric) => metric.id === id)?.status ?? "empty";
}

function resolveReadinessLabel(
  percent: number,
  confirmedCount: number
): MarketReadinessLabel {
  if (confirmedCount === 0) {
    return "not_ready";
  }
  if (
    percent >= 80 &&
    confirmedCount >= MARKET_MIN_CONFIRMED_POLICIES
  ) {
    return "comparison_ready";
  }
  if (percent >= 60) {
    return "almost_ready";
  }
  if (percent >= 35) {
    return "preparing";
  }
  return "not_ready";
}

function buildComparisonBlockers(
  policies: UserPolicy[],
  documents: UserDocument[],
  completeness: CompletenessMetric[],
  kpis: DashboardPortfolioKpis
): MarketReadinessBlocker[] {
  const confirmed = policies.filter((policy) => !policy.requiresReview);
  const pendingReview = policies.filter((policy) => policy.requiresReview);
  const blockers: MarketReadinessBlocker[] = [];

  if (confirmed.length < MARKET_MIN_CONFIRMED_POLICIES) {
    blockers.push({
      id: "confirmed-policies",
      title: "Servono più polizze confermate",
      description: `Atlas richiede almeno ${MARKET_MIN_CONFIRMED_POLICIES} polizze verificate prima di preparare confronti strutturati.`,
      progressPercent: Math.round(
        (confirmed.length / MARKET_MIN_CONFIRMED_POLICIES) * 100
      ),
      progressDetail: `${confirmed.length} di ${MARKET_MIN_CONFIRMED_POLICIES} confermate`,
      ctaLabel: pendingReview[0] ? "Rivedi bozza AI" : "Vedi polizze",
      ctaHref: pendingReview[0]
        ? `/policies/${pendingReview[0].id}/edit`
        : "/policies",
      priority: "high",
    });
  }

  const premiumPercent = metricPercent(completeness, "premium-complete");
  if (metricStatus(completeness, "premium-complete") !== "complete") {
    blockers.push({
      id: "premium-data",
      title: "Completa i dati premio",
      description:
        "I confronti futuri necessitano premi estratti o verificati sulle polizze confermate.",
      progressPercent: premiumPercent,
      progressDetail:
        completeness.find((m) => m.id === "premium-complete")?.detail ?? "—",
      ctaLabel: "Apri polizze",
      ctaHref: "/policies",
      priority: "high",
    });
  }

  const renewalPercent = metricPercent(completeness, "renewal-complete");
  if (metricStatus(completeness, "renewal-complete") !== "complete") {
    blockers.push({
      id: "renewal-dates",
      title: "Aggiungi date di rinnovo",
      description:
        "Le scadenze permettono di pianificare confronti prima dei rinnovi.",
      progressPercent: renewalPercent,
      progressDetail:
        completeness.find((m) => m.id === "renewal-complete")?.detail ?? "—",
      ctaLabel: "Completa scadenze",
      ctaHref: "/policies",
      priority: "medium",
    });
  }

  if (
    kpis.averageExtractionConfidence !== null &&
    kpis.averageExtractionConfidence < EXTRACTION_READINESS_THRESHOLD
  ) {
    blockers.push({
      id: "extraction-quality",
      title: "Migliora la qualità estrazione",
      description:
        "Confidenza media sotto la soglia consigliata per confronti affidabili.",
      progressPercent: kpis.averageExtractionConfidence,
      progressDetail: `${kpis.averageExtractionConfidence}% medio · ${getExtractionConfidenceLabel(getExtractionConfidenceTier(kpis.averageExtractionConfidence))}`,
      ctaLabel: "Rivedi estrazioni",
      ctaHref: pendingReview[0]
        ? `/policies/${pendingReview[0].id}`
        : "/policies",
      priority: "high",
    });
  } else if (pendingReview.length > 0) {
    blockers.push({
      id: "confirm-drafts",
      title: "Conferma le bozze AI",
      description:
        "Le bozze non verificate riducono la precisione dei futuri confronti.",
      progressPercent:
        policies.length > 0
          ? Math.round(
              ((policies.length - pendingReview.length) / policies.length) *
                100
            )
          : null,
      progressDetail: `${pendingReview.length} bozza${pendingReview.length === 1 ? "" : "e"} in attesa`,
      ctaLabel: "Rivedi bozza AI",
      ctaHref: `/policies/${pendingReview[0].id}/edit`,
      priority: "high",
    });
  }

  const uniqueCategories = new Set(
    confirmed.map((policy) => policy.policyType)
  ).size;

  if (confirmed.length > 0 && uniqueCategories < 2) {
    blockers.push({
      id: "category-diversity",
      title: "Manca diversità di categorie",
      description:
        "Aggiungi polizze in categorie diverse (es. salute, auto, casa) per confronti più utili.",
      progressPercent: Math.round((uniqueCategories / 2) * 100),
      progressDetail: `${uniqueCategories} categoria${uniqueCategories === 1 ? "" : "e"} rilevata`,
      ctaLabel: "Carica PDF",
      ctaHref: "/documents",
      priority: "medium",
    });
  }

  const linkedPercent = metricPercent(completeness, "documents-linked");
  if (
    policies.length > 0 &&
    metricStatus(completeness, "documents-linked") !== "complete"
  ) {
    blockers.push({
      id: "linked-pdfs",
      title: "Collega i PDF alle polizze",
      description:
        "Ogni polizza dovrebbe tracciare il documento sorgente per audit e confronto.",
      progressPercent: linkedPercent,
      progressDetail:
        completeness.find((m) => m.id === "documents-linked")?.detail ?? "—",
      ctaLabel: "Vai ai documenti",
      ctaHref: "/documents",
      priority: "medium",
    });
  }

  if (documents.length === 0) {
    blockers.push({
      id: "upload-documents",
      title: "Carica polizze PDF",
      description: "Senza documenti non è possibile costruire intelligence di mercato.",
      progressPercent: 0,
      progressDetail: "Archivio vuoto",
      ctaLabel: "Carica PDF",
      ctaHref: "/documents",
      priority: "high",
    });
  }

  const coveragePercent = metricPercent(completeness, "coverages-assigned");
  if (
    kpis.coverageCount > 0 &&
    metricStatus(completeness, "coverages-assigned") !== "complete"
  ) {
    blockers.push({
      id: "coverage-structure",
      title: "Completa le coperture strutturate",
      description:
        "Assegna le coperture alle persone per confronti su LAMal e complementari.",
      progressPercent: coveragePercent,
      progressDetail:
        completeness.find((m) => m.id === "coverages-assigned")?.detail ?? "—",
      ctaLabel: "Rivedi coperture",
      ctaHref: "/policies",
      priority: "medium",
    });
  }

  return blockers.sort((a, b) => {
    const order = { high: 0, medium: 1 };
    return order[a.priority] - order[b.priority];
  });
}

function computeMarketReadinessPercent(
  policies: UserPolicy[],
  documents: UserDocument[],
  completeness: CompletenessMetric[],
  kpis: DashboardPortfolioKpis
): number {
  const confirmed = policies.filter((policy) => !policy.requiresReview);

  const weights: Array<{ value: number | null; weight: number }> = [
    {
      value:
        confirmed.length > 0
          ? Math.min(
              100,
              Math.round(
                (confirmed.length / MARKET_MIN_CONFIRMED_POLICIES) * 100
              )
            )
          : 0,
      weight: 22,
    },
    { value: metricPercent(completeness, "policies-confirmed"), weight: 18 },
    { value: metricPercent(completeness, "premium-complete"), weight: 16 },
    { value: metricPercent(completeness, "renewal-complete"), weight: 12 },
    { value: metricPercent(completeness, "documents-linked"), weight: 10 },
    { value: metricPercent(completeness, "coverages-assigned"), weight: 10 },
    {
      value:
        documents.length > 0
          ? metricPercent(completeness, "documents-analyzed")
          : null,
      weight: 7,
    },
    {
      value:
        kpis.averageExtractionConfidence !== null
          ? Math.min(100, kpis.averageExtractionConfidence)
          : null,
      weight: 5,
    },
  ];

  const uniqueCategories = new Set(
    confirmed.map((policy) => policy.policyType)
  ).size;
  weights.push({
    value:
      confirmed.length > 0
        ? Math.min(100, Math.round((uniqueCategories / TARGET_CATEGORY_DIVERSITY) * 100))
        : null,
    weight: 10,
  });

  let totalWeight = 0;
  let weightedSum = 0;

  for (const { value, weight } of weights) {
    if (value === null) {
      continue;
    }
    totalWeight += weight;
    weightedSum += value * weight;
  }

  if (totalWeight === 0) {
    return 0;
  }

  return Math.round(weightedSum / totalWeight);
}

function buildUnlockSteps(
  policies: UserPolicy[],
  documents: UserDocument[],
  progression: PortfolioProgression
): MarketUnlockStep[] {
  const confirmed = policies.filter((policy) => !policy.requiresReview);

  return [
    {
      id: "documents",
      label: "Archivio PDF attivo",
      done: documents.length > 0,
      detail:
        documents.length > 0
          ? `${documents.length} documento${documents.length === 1 ? "" : "i"}`
          : "Carica il primo PDF",
    },
    {
      id: "structured",
      label: "Polizze strutturate",
      done: policies.length > 0,
      detail:
        policies.length > 0
          ? `${policies.length} scheda${policies.length === 1 ? "" : "e"}`
          : "In attesa estrazione",
    },
    {
      id: "confirmed",
      label: "Dati verificati",
      done: confirmed.length >= MARKET_MIN_CONFIRMED_POLICIES,
      detail: `${confirmed.length} di ${MARKET_MIN_CONFIRMED_POLICIES} confermate`,
    },
    {
      id: "benchmark-prep",
      label: "Dataset benchmark",
      done: false,
      detail: "In preparazione · nessun dataset CH pubblico collegato",
    },
    {
      id: "module",
      label: "Modulo confronti",
      done: progression.unlocks.find((m) => m.id === "market")?.unlocked ?? false,
      detail: "Sbloccato quando i prerequisiti portafoglio sono soddisfatti",
    },
  ];
}

function buildOverviewSignals(
  policies: UserPolicy[],
  documents: UserDocument[],
  kpis: DashboardPortfolioKpis,
  readinessPercent: number
): MarketOverviewSignal[] {
  const confirmed = policies.filter((policy) => !policy.requiresReview);
  const providers = [
    ...new Set(
      confirmed
        .map((policy) => policy.provider?.trim())
        .filter((value): value is string => Boolean(value))
    ),
  ];
  const categories = new Set(confirmed.map((policy) => policy.policyType));
  const withPremium = confirmed.filter(
    (policy) =>
      policy.premiumAmount !== null &&
      Number.isFinite(policy.premiumAmount) &&
      policy.premiumAmount > 0
  );
  const withRenewal = confirmed.filter((policy) => policy.renewalDate);
  const withCoverages = confirmed.filter(
    (policy) => getPolicyCoverages(policy.details).length > 0
  );
  const linked = confirmed.filter((policy) => policy.documentId);

  return [
    {
      id: "readiness",
      label: "Market readiness",
      value: `${readinessPercent}%`,
      subtext: "Preparazione confronti futuri",
      available: true,
    },
    {
      id: "eligible",
      label: "Polizze idonee",
      value: String(confirmed.length),
      subtext: "Confermate per confronto futuro",
      available: confirmed.length > 0,
    },
    {
      id: "providers",
      label: "Compagnie identificate",
      value: providers.length > 0 ? String(providers.length) : "—",
      subtext:
        providers.length > 0
          ? providers.slice(0, 2).join(", ") +
            (providers.length > 2 ? ` +${providers.length - 2}` : "")
          : "Non disponibile",
      available: providers.length > 0,
    },
    {
      id: "categories",
      label: "Categorie mappate",
      value: categories.size > 0 ? String(categories.size) : "—",
      subtext:
        categories.size > 0
          ? [...categories].map((t) => policyTypeLabels[t]).join(" · ")
          : "Nessuna categoria",
      available: categories.size > 0,
    },
    {
      id: "premiums",
      label: "Dati premio",
      value:
        confirmed.length > 0
          ? `${withPremium.length}/${confirmed.length}`
          : "—",
      subtext: "Polizze con premio disponibile",
      available: withPremium.length > 0,
    },
    {
      id: "renewals",
      label: "Rinnovi identificati",
      value:
        confirmed.length > 0
          ? `${withRenewal.length}/${confirmed.length}`
          : "—",
      subtext: "Date di rinnovo presenti",
      available: withRenewal.length > 0,
    },
    {
      id: "coverages",
      label: "Coperture strutturate",
      value: withCoverages.length > 0 ? String(kpis.coverageCount) : "—",
      subtext:
        kpis.unassignedCoverageCount > 0
          ? `${kpis.unassignedCoverageCount} da assegnare`
          : "Dati copertura disponibili",
      available: withCoverages.length > 0,
    },
    {
      id: "confirmed",
      label: "Polizze confermate",
      value: String(kpis.confirmedPolicies),
      subtext:
        kpis.policiesRequiringReview > 0
          ? `${kpis.policiesRequiringReview} in revisione`
          : "Portafoglio verificato",
      available: kpis.confirmedPolicies > 0,
    },
    {
      id: "pdfs",
      label: "PDF collegati",
      value:
        confirmed.length > 0 ? `${linked.length}/${confirmed.length}` : "—",
      subtext: "Origine documentale tracciata",
      available: linked.length > 0,
    },
    {
      id: "confidence",
      label: "Confidenza estrazione",
      value:
        kpis.averageExtractionConfidence !== null
          ? `${kpis.averageExtractionConfidence}%`
          : "—",
      subtext:
        kpis.averageExtractionConfidence !== null
          ? getExtractionConfidenceLabel(
              getExtractionConfidenceTier(kpis.averageExtractionConfidence)
            )
          : "Non disponibile",
      available: kpis.averageExtractionConfidence !== null,
    },
  ];
}

function buildCategoryMap(policies: UserPolicy[]): MarketCategorySlot[] {
  const confirmed = policies.filter((policy) => !policy.requiresReview);

  return typedPolicyTypes.map((type) => {
    const matching = confirmed.filter((policy) => policy.policyType === type);
    const detected = matching.length > 0;
    const hasPremium = matching.some(
      (policy) =>
        policy.premiumAmount !== null &&
        Number.isFinite(policy.premiumAmount) &&
        policy.premiumAmount > 0
    );
    const hasCoverage = matching.some(
      (policy) => getPolicyCoverages(policy.details).length > 0
    );

    let readinessDetail = "Categoria non presente nel portafoglio";
    if (detected) {
      if (hasPremium && hasCoverage) {
        readinessDetail = "Pronta per confronto futuro";
      } else if (hasPremium) {
        readinessDetail = "Premio disponibile · coperture da completare";
      } else {
        readinessDetail = "Rilevata · completa premio e coperture";
      }
    }

    return {
      type,
      label: policyTypeLabels[type],
      detected,
      policyCount: matching.length,
      comparisonReady: detected && hasPremium && !matching.some((p) => p.requiresReview),
      readinessDetail,
    };
  });
}

export const marketFutureModules: MarketFutureModule[] = [
  {
    id: "ch-benchmarks",
    label: "Benchmark svizzeri",
    description: "Confronto con medie di mercato CH quando un dataset verificato sarà disponibile.",
    requirement: "Portafoglio confermato + dataset benchmark",
  },
  {
    id: "overpricing",
    label: "Rilevamento sovrapprezzi",
    description: "Segnalazione premi fuori banda rispetto a riferimenti reali, non stime.",
    requirement: "Premi verificati + benchmark attivo",
  },
  {
    id: "duplicates",
    label: "Analisi duplicazioni",
    description: "Individuazione sovrapposizioni tra coperture dello stesso portafoglio.",
    requirement: "Coperture strutturate e assegnate",
  },
  {
    id: "premium-compare",
    label: "Confronto premi mercato",
    description: "Allineamento premi estratti con fasce di mercato documentate.",
    requirement: "Dataset premi CH + polizze idonee",
  },
  {
    id: "coverage-opt",
    label: "Ottimizzazione coperture",
    description: "Suggerimenti su gap e ridondanze basati sul portafoglio reale.",
    requirement: "Coperture documentate",
  },
  {
    id: "lamal",
    label: "Confronto LAMal",
    description: "Analisi modelli base e franchise su dati cassa malati estratti.",
    requirement: "Polizza salute confermata + LAMal strutturata",
  },
  {
    id: "complementary",
    label: "Confronto complementari",
    description: "Valutazione prodotti complementari rispetto al profilo familiare.",
    requirement: "Persone e coperture salute verificate",
  },
];

export function computeMarketIntelligence(
  policies: UserPolicy[],
  documents: UserDocument[]
): MarketIntelligence {
  const progression = computePortfolioProgression(policies, documents);
  const dashboard = computeDashboardIntelligence(policies, documents);
  const { kpis } = dashboard;
  const confirmed = policies.filter((policy) => !policy.requiresReview);

  const readinessPercent = computeMarketReadinessPercent(
    policies,
    documents,
    progression.completeness,
    kpis
  );

  const readinessLabel = resolveReadinessLabel(
    readinessPercent,
    confirmed.length
  );

  const blockers = buildComparisonBlockers(
    policies,
    documents,
    progression.completeness,
    kpis
  );

  let headline = "Atlas prepara il tuo portafoglio per l'intelligence di mercato";
  let subheadline =
    "La readiness misura la completezza del portafoglio verificato.";

  if (readinessLabel === "not_ready") {
    headline = "Portafoglio non ancora pronto per confronti";
    subheadline =
      "Carica PDF, conferma bozze AI e completa premi e rinnovi per avanzare.";
  } else if (readinessLabel === "preparing") {
    headline = "Preparazione confronti in corso";
    subheadline =
      "Continua a verificare i dati estratti: ogni campo completo migliora la readiness.";
  } else if (readinessLabel === "almost_ready") {
    headline = "Servono ancora dati verificati";
    subheadline =
      "Completa premi, rinnovi e conferme prima di preparare confronti strutturati.";
  } else {
    headline = "Dati sufficienti per la preparazione";
    subheadline =
      "I confronti di mercato e i benchmark restano in preparazione: nessun risparmio stimato in questa versione.";
  }

  const categories = buildCategoryMap(policies);
  const detectedCategories = categories.filter((slot) => slot.detected);

  return {
    readiness: {
      percent: readinessPercent,
      label: readinessLabel,
      labelText: readinessLabelText[readinessLabel],
      headline,
      subheadline,
      blockers: blockers.slice(0, 8),
      unlockSteps: buildUnlockSteps(policies, documents, progression),
    },
    overview: buildOverviewSignals(
      policies,
      documents,
      kpis,
      readinessPercent
    ),
    categories,
    futureModules: marketFutureModules,
    progression,
    kpis,
    hasPortfolio: policies.length > 0 || documents.length > 0,
    hasInsufficientData:
      policies.length === 0 && documents.length === 0,
    comparisonEligibleCount: confirmed.length,
    providersIdentified: [
      ...new Set(
        confirmed
          .map((p) => p.provider?.trim())
          .filter((v): v is string => Boolean(v))
      ),
    ],
    missingCategoryCount: typedPolicyTypes.length - detectedCategories.length,
  };
}

export const getMarketIntelligence = cache(async (): Promise<MarketIntelligence> => {
  const [policies, documents] = await Promise.all([
    getCurrentUserPolicies(),
    getCurrentUserDocuments(),
  ]);

  return computeMarketIntelligence(policies, documents);
});

/** Policies eligible for future comparison (confirmed, not pending review). */
export function getComparisonEligiblePolicies(policies: UserPolicy[]): UserPolicy[] {
  return policies.filter((policy) => !policy.requiresReview);
}

export function formatMarketPolicyLabel(policy: UserPolicy): string {
  const typeLabel = getPolicyTypeLabel(
    policy.policyType,
    policy.policyCategoryLabel
  );
  const provider = policy.provider?.trim() || "Compagnia non disponibile";
  return `${provider} · ${typeLabel}`;
}
