import "server-only";

import { cache } from "react";
import {
  computeDashboardIntelligence,
  type DashboardPortfolioKpis,
} from "@/lib/dashboard-intelligence";
import { computeMarketIntelligence } from "@/lib/market-intelligence";
import {
  computePortfolioProgression,
  type CompletenessMetric,
  type PortfolioProgression,
} from "@/lib/portfolio-progression";
import {
  computeRecommendationsIntelligence,
  type RecommendationsIntelligence,
} from "@/lib/recommendations-intelligence";
import {
  getExtractionConfidenceLabel,
  getExtractionConfidenceTier,
} from "@/lib/policy-extraction-reveal";
import { typedPolicyTypes } from "@/lib/policy-types";
import { getCurrentUserDocuments } from "@/lib/documents";
import { getCurrentUserPolicies } from "@/lib/policies";
import type { TypedPolicyType, UserDocument, UserPolicy } from "@/lib/types";

export const CONSULTING_MIN_CONFIRMED_FOR_REVIEW = 1;
const EXTRACTION_REVIEW_THRESHOLD = 65;

export type ConsultingReadinessLabel =
  | "not_ready"
  | "incomplete"
  | "pre_check"
  | "review_ready";

export type ConsultingChecklistStatus = "done" | "partial" | "pending";

export type ConsultingChecklistItem = {
  id: string;
  title: string;
  description: string;
  status: ConsultingChecklistStatus;
  progressPercent: number | null;
  progressDetail: string;
  ctaLabel: string;
  ctaHref: string;
};

export type ConsultingExpertTopic = {
  id: string;
  title: string;
  description: string;
  value: string;
  available: boolean;
};

export type ConsultingFutureModule = {
  id: string;
  label: string;
  description: string;
  requirement: string;
};

export type ConsultingPortfolioSnapshot = {
  confirmedPolicies: number;
  pendingReviewPolicies: number;
  totalPolicies: number;
  documentsTotal: number;
  documentsAnalyzed: number;
  linkedPdfCount: number;
  highPriorityRecommendations: number;
  totalRecommendations: number;
  unassignedCoverages: number;
  missingCriticalFields: number;
  marketReadinessLabel: string | null;
  marketReadinessPercent: number | null;
  averageExtractionConfidence: number | null;
};

export type ConsultingReadinessScore = {
  percent: number;
  label: ConsultingReadinessLabel;
  labelText: string;
  headline: string;
  subheadline: string;
  blockers: ConsultingChecklistItem[];
};

export type ConsultingIntelligence = {
  readiness: ConsultingReadinessScore;
  checklist: ConsultingChecklistItem[];
  expertTopics: ConsultingExpertTopic[];
  futureModules: ConsultingFutureModule[];
  snapshot: ConsultingPortfolioSnapshot;
  progression: PortfolioProgression;
  kpis: DashboardPortfolioKpis;
  recommendations: RecommendationsIntelligence;
  hasPortfolio: boolean;
  hasInsufficientData: boolean;
};

const readinessLabelText: Record<ConsultingReadinessLabel, string> = {
  not_ready: "Non ancora pronto",
  incomplete: "Da completare",
  pre_check: "Dossier in preparazione",
  review_ready: "Dossier ben preparato",
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

function countDuplicatePolicyTypes(policies: UserPolicy[]): number {
  const confirmed = policies.filter((policy) => !policy.requiresReview);
  const counts = new Map<TypedPolicyType, number>();

  for (const policy of confirmed) {
    counts.set(policy.policyType, (counts.get(policy.policyType) ?? 0) + 1);
  }

  return [...counts.values()].filter((count) => count > 1).length;
}

function countMissingCriticalFields(policies: UserPolicy[]): number {
  const confirmed = policies.filter((policy) => !policy.requiresReview);
  let missing = 0;

  for (const policy of confirmed) {
    if (!policy.provider?.trim()) {
      missing += 1;
    }
    if (policy.premiumAmount === null) {
      missing += 1;
    }
    if (!policy.renewalDate) {
      missing += 1;
    }
  }

  return missing;
}

function resolveReadinessLabel(
  percent: number,
  confirmedCount: number,
  highPriorityCount: number
): ConsultingReadinessLabel {
  if (confirmedCount === 0 && percent < 25) {
    return "not_ready";
  }
  if (
    percent >= 78 &&
    confirmedCount >= CONSULTING_MIN_CONFIRMED_FOR_REVIEW &&
    highPriorityCount === 0
  ) {
    return "review_ready";
  }
  if (percent >= 55 && confirmedCount >= 1) {
    return "pre_check";
  }
  if (percent >= 25 || confirmedCount > 0) {
    return "incomplete";
  }
  return "not_ready";
}

function computeReviewReadinessPercent(
  policies: UserPolicy[],
  documents: UserDocument[],
  completeness: CompletenessMetric[],
  kpis: DashboardPortfolioKpis,
  recommendations: RecommendationsIntelligence
): number {
  const confirmed = policies.filter((policy) => !policy.requiresReview);
  const highPriority = recommendations.executive.highPriorityCount;

  const weights: Array<{ value: number | null; weight: number }> = [
    {
      value:
        policies.length > 0
          ? Math.round((confirmed.length / policies.length) * 100)
          : 0,
      weight: 22,
    },
    { value: metricPercent(completeness, "policies-confirmed"), weight: 18 },
    { value: metricPercent(completeness, "premium-complete"), weight: 14 },
    { value: metricPercent(completeness, "renewal-complete"), weight: 12 },
    { value: metricPercent(completeness, "documents-linked"), weight: 10 },
    { value: metricPercent(completeness, "coverages-assigned"), weight: 10 },
    {
      value:
        documents.length > 0
          ? metricPercent(completeness, "documents-analyzed")
          : null,
      weight: 8,
    },
    {
      value:
        kpis.averageExtractionConfidence !== null
          ? Math.min(100, kpis.averageExtractionConfidence)
          : null,
      weight: 6,
    },
    {
      value:
        highPriority === 0
          ? 100
          : Math.max(0, 100 - highPriority * 25),
      weight: 10,
    },
  ];

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

function mapCompletenessStatus(
  status: CompletenessMetric["status"]
): ConsultingChecklistStatus {
  if (status === "complete") {
    return "done";
  }
  if (status === "partial") {
    return "partial";
  }
  return "pending";
}

function buildPreparationChecklist(
  policies: UserPolicy[],
  documents: UserDocument[],
  completeness: CompletenessMetric[],
  kpis: DashboardPortfolioKpis,
  recommendations: RecommendationsIntelligence
): ConsultingChecklistItem[] {
  const confirmed = policies.filter((policy) => !policy.requiresReview);
  const pendingReview = policies.filter((policy) => policy.requiresReview);
  const analyzedDocs = documents.filter((doc) => doc.status === "analyzed");
  const firstPending = pendingReview[0];
  const firstHighPriority = recommendations.priorityActions[0];

  const items: ConsultingChecklistItem[] = [];

  const pushItem = (item: ConsultingChecklistItem) => {
    items.push(item);
  };

  pushItem({
    id: "upload-pdf",
    title: "Carica almeno una polizza PDF",
    description:
      "Il dossier per un revisore umano parte da documenti assicurativi archiviati in Atlas.",
    status: documents.length > 0 ? "done" : "pending",
    progressPercent: documents.length > 0 ? 100 : 0,
    progressDetail:
      documents.length > 0
        ? `${documents.length} documento${documents.length === 1 ? "" : "i"}`
        : "Archivio vuoto",
    ctaLabel: "Carica PDF",
    ctaHref: "/documents",
  });

  pushItem({
    id: "analyze-documents",
    title: "Analizza i documenti caricati",
    description:
      "L'estrazione AI struttura i dati che un esperto potrà verificare in revisione.",
    status:
      documents.length === 0
        ? "pending"
        : analyzedDocs.length === documents.length
          ? "done"
          : "partial",
    progressPercent: metricPercent(completeness, "documents-analyzed"),
    progressDetail:
      documents.length > 0
        ? `${analyzedDocs.length} di ${documents.length} analizzati`
        : "—",
    ctaLabel: "Vai ai documenti",
    ctaHref: "/documents",
  });

  pushItem({
    id: "confirm-drafts",
    title: "Conferma le bozze AI",
    description:
      "Le bozze non verificate non possono essere incluse in un dossier affidabile per revisione.",
    status:
      policies.length === 0
        ? "pending"
        : pendingReview.length === 0
          ? "done"
          : "partial",
    progressPercent: metricPercent(completeness, "policies-confirmed"),
    progressDetail:
      policies.length > 0
        ? `${confirmed.length} di ${policies.length} confermate`
        : "Nessuna polizza",
    ctaLabel: firstPending ? "Rivedi bozza AI" : "Vedi polizze",
    ctaHref: firstPending
      ? `/policies/${firstPending.id}/edit`
      : "/policies",
  });

  pushItem({
    id: "premium-renewal",
    title: "Completa premio e rinnovo",
    description:
      "Premi e scadenze permettono al revisore di valutare continuità e opportunità.",
    status:
      metricStatus(completeness, "premium-complete") === "complete" &&
      metricStatus(completeness, "renewal-complete") === "complete"
        ? "done"
        : confirmed.length > 0
          ? "partial"
          : "pending",
    progressPercent:
      metricPercent(completeness, "premium-complete") !== null &&
      metricPercent(completeness, "renewal-complete") !== null
        ? Math.round(
            ((metricPercent(completeness, "premium-complete") ?? 0) +
              (metricPercent(completeness, "renewal-complete") ?? 0)) /
              2
          )
        : null,
    progressDetail: `${completeness.find((m) => m.id === "premium-complete")?.detail ?? "—"} · ${completeness.find((m) => m.id === "renewal-complete")?.detail ?? "—"}`,
    ctaLabel: "Completa polizze",
    ctaHref: "/policies",
  });

  pushItem({
    id: "link-pdfs",
    title: "Collega PDF alle polizze",
    description:
      "Ogni scheda dovrebbe tracciare il documento sorgente per audit e second opinion.",
    status: mapCompletenessStatus(metricStatus(completeness, "documents-linked")),
    progressPercent: metricPercent(completeness, "documents-linked"),
    progressDetail:
      completeness.find((m) => m.id === "documents-linked")?.detail ?? "—",
    ctaLabel: "Vai ai documenti",
    ctaHref: "/documents",
  });

  if (kpis.coverageCount > 0) {
    pushItem({
      id: "assign-coverages",
      title: "Risolvi coperture non assegnate",
      description:
        "Coperture senza persona o incerte riducono la qualità del briefing per l'esperto.",
      status: mapCompletenessStatus(metricStatus(completeness, "coverages-assigned")),
      progressPercent: metricPercent(completeness, "coverages-assigned"),
      progressDetail:
        completeness.find((m) => m.id === "coverages-assigned")?.detail ?? "—",
      ctaLabel: "Rivedi coperture",
      ctaHref: "/policies",
    });
  }

  const uniqueCategories = new Set(
    confirmed.map((policy) => policy.policyType)
  ).size;

  if (confirmed.length > 0 && uniqueCategories < 2) {
    pushItem({
      id: "categories",
      title: "Aggiungi più categorie assicurative",
      description:
        "Un portafoglio diversificato aiuta il revisore a valutare lacune tra ramo salute, auto e casa.",
      status: "partial",
      progressPercent: Math.round((uniqueCategories / 2) * 100),
      progressDetail: `${uniqueCategories} categoria rilevata`,
      ctaLabel: "Carica PDF",
      ctaHref: "/documents",
    });
  }

  if (recommendations.executive.highPriorityCount > 0) {
    pushItem({
      id: "priority-recs",
      title: "Verifica raccomandazioni prioritarie",
      description:
        "Risolvi le azioni urgenti segnalate da Atlas prima di sottoporre il dossier a revisione.",
      status: "partial",
      progressPercent: Math.max(
        0,
        100 - recommendations.executive.highPriorityCount * 20
      ),
      progressDetail: `${recommendations.executive.highPriorityCount} azione${recommendations.executive.highPriorityCount === 1 ? "" : "i"} prioritarie`,
      ctaLabel: firstHighPriority ? firstHighPriority.ctaLabel : "Vedi raccomandazioni",
      ctaHref: firstHighPriority?.ctaHref ?? "/recommendations",
    });
  }

  if (
    kpis.averageExtractionConfidence !== null &&
    kpis.averageExtractionConfidence < EXTRACTION_REVIEW_THRESHOLD
  ) {
    pushItem({
      id: "extraction-quality",
      title: "Migliora la qualità estrazione",
      description:
        "Dati a bassa confidenza richiedono verifica manuale prima di una revisione esterna.",
      status: "partial",
      progressPercent: kpis.averageExtractionConfidence,
      progressDetail: `${kpis.averageExtractionConfidence}% · ${getExtractionConfidenceLabel(getExtractionConfidenceTier(kpis.averageExtractionConfidence))}`,
      ctaLabel: "Rivedi estrazioni",
      ctaHref: firstPending
        ? `/policies/${firstPending.id}`
        : "/policies",
    });
  }

  return items;
}

function buildBlockersFromChecklist(
  checklist: ConsultingChecklistItem[]
): ConsultingChecklistItem[] {
  return checklist.filter((item) => item.status !== "done").slice(0, 6);
}

function buildExpertReviewTopics(
  policies: UserPolicy[],
  documents: UserDocument[],
  completeness: CompletenessMetric[],
  kpis: DashboardPortfolioKpis,
  progression: PortfolioProgression,
  recommendations: RecommendationsIntelligence
): ConsultingExpertTopic[] {
  const confirmed = policies.filter((policy) => !policy.requiresReview);
  const pendingReview = policies.filter((policy) => policy.requiresReview);
  const duplicateCategories = countDuplicatePolicyTypes(policies);
  const missingCategories =
    typedPolicyTypes.length -
    new Set(confirmed.map((p) => p.policyType)).size;

  return [
    {
      id: "completeness",
      title: "Completezza portafoglio",
      description:
        "Un esperto verificherà che ogni area assicurativa rilevante sia rappresentata e documentata.",
      value: `${progression.overallPercent}%`,
      available: policies.length > 0,
    },
    {
      id: "gaps",
      title: "Coperture mancanti o incomplete",
      description:
        "Analisi di lacune, coperture non assegnate e dati incerti nell'estrazione.",
      value:
        kpis.unassignedCoverageCount > 0
          ? `${kpis.unassignedCoverageCount} da assegnare`
          : kpis.coverageCount > 0
            ? "Struttura completa"
            : "—",
      available: kpis.coverageCount > 0 || kpis.unassignedCoverageCount > 0,
    },
    {
      id: "review-queue",
      title: "Polizze da rivedere",
      description:
        "Bozze AI e campi incerti da confermare prima di una revisione umana.",
      value: String(pendingReview.length),
      available: policies.length > 0,
    },
    {
      id: "premiums",
      title: "Premi e scadenze",
      description:
        "Coerenza tra premi estratti, frequenza e date di rinnovo per pianificazione.",
      value: completeness.find((m) => m.id === "premium-complete")?.detail ?? "—",
      available: confirmed.length > 0,
    },
    {
      id: "documents",
      title: "Documenti collegati",
      description:
        "Tracciabilità PDF → scheda polizza per audit indipendente.",
      value: completeness.find((m) => m.id === "documents-linked")?.detail ?? "—",
      available: policies.length > 0,
    },
    {
      id: "duplicates",
      title: "Possibili doppioni",
      description:
        "Segnalazione di più polizze nella stessa categoria da chiarire con l'esperto.",
      value:
        duplicateCategories > 0
          ? `${duplicateCategories} categoria${duplicateCategories === 1 ? "" : "e"} duplicate`
          : "Nessun doppione rilevato",
      available: confirmed.length > 0,
    },
    {
      id: "confidence",
      title: "Dati poco affidabili",
      description:
        "Campi sotto soglia di confidenza che richiedono verifica prima del briefing.",
      value:
        kpis.averageExtractionConfidence !== null
          ? `${kpis.averageExtractionConfidence}% medio`
          : "—",
      available: kpis.averageExtractionConfidence !== null,
    },
    {
      id: "recommendations",
      title: "Azioni Atlas prioritarie",
      description:
        "Punti aperti dal motore raccomandazioni da risolvere o portare in revisione.",
      value: String(recommendations.executive.highPriorityCount),
      available: recommendations.hasPortfolio,
    },
    {
      id: "missing-categories",
      title: "Categorie non mappate",
      description:
        "Aree assicurative standard non ancora presenti nel portafoglio.",
      value: `${missingCategories} non presenti`,
      available: confirmed.length > 0,
    },
  ];
}

export const consultingFutureModules: ConsultingFutureModule[] = [
  {
    id: "portfolio-review",
    label: "Revisione portafoglio assicurativo",
    description:
      "Sessione con revisore indipendente sul dossier Atlas verificato.",
    requirement: "Review readiness ≥ 78% · bozze confermate",
  },
  {
    id: "gaps-duplicates",
    label: "Controllo doppioni e lacune",
    description:
      "Analisi sovrapposizioni e gap tra coperture del nucleo familiare.",
    requirement: "Coperture strutturate e assegnate",
  },
  {
    id: "pdf-report",
    label: "Preparazione report PDF",
    description:
      "Report esportabile per consulente esterno basato su dati confermati.",
    requirement: "Dossier completo + moduli attivi",
  },
  {
    id: "switch-support",
    label: "Supporto al cambio compagnia",
    description:
      "Accompagnamento su decisioni di cambio — senza vendita diretta.",
    requirement: "Servizio consulenza attivo",
  },
  {
    id: "second-opinion",
    label: "Second opinion indipendente",
    description:
      "Valutazione esterna delle scelte assicurative documentate in Atlas.",
    requirement: "Review readiness · revisione indipendente",
  },
  {
    id: "household-audit",
    label: "Audit famiglia / nucleo domestico",
    description:
      "Revisione persone assicurate e coperture per famiglia o convivenza.",
    requirement: "Persone identificate · polizze salute/casa",
  },
];

function buildSnapshot(
  policies: UserPolicy[],
  documents: UserDocument[],
  kpis: DashboardPortfolioKpis,
  recommendations: RecommendationsIntelligence,
  marketReadinessPercent: number | null,
  marketReadinessLabel: string | null
): ConsultingPortfolioSnapshot {
  const confirmed = policies.filter((policy) => !policy.requiresReview);
  const linked = confirmed.filter((policy) => policy.documentId);

  return {
    confirmedPolicies: confirmed.length,
    pendingReviewPolicies: kpis.policiesRequiringReview,
    totalPolicies: policies.length,
    documentsTotal: documents.length,
    documentsAnalyzed: kpis.analyzedDocuments,
    linkedPdfCount: linked.length,
    highPriorityRecommendations: recommendations.executive.highPriorityCount,
    totalRecommendations: recommendations.executive.totalRecommendations,
    unassignedCoverages: kpis.unassignedCoverageCount,
    missingCriticalFields: countMissingCriticalFields(policies),
    marketReadinessLabel,
    marketReadinessPercent,
    averageExtractionConfidence: kpis.averageExtractionConfidence,
  };
}

export function computeConsultingIntelligence(
  policies: UserPolicy[],
  documents: UserDocument[]
): ConsultingIntelligence {
  const progression = computePortfolioProgression(policies, documents);
  const dashboard = computeDashboardIntelligence(policies, documents);
  const recommendations = computeRecommendationsIntelligence(policies, documents);
  const market = computeMarketIntelligence(policies, documents);
  const { kpis } = dashboard;

  const checklist = buildPreparationChecklist(
    policies,
    documents,
    progression.completeness,
    kpis,
    recommendations
  );

  const readinessPercent = computeReviewReadinessPercent(
    policies,
    documents,
    progression.completeness,
    kpis,
    recommendations
  );

  const readinessLabel = resolveReadinessLabel(
    readinessPercent,
    kpis.confirmedPolicies,
    recommendations.executive.highPriorityCount
  );

  let headline = "Atlas prepara il tuo dossier per una revisione umana";
  let subheadline =
    "Il servizio consulenza è in preparazione — readiness basata sul portafoglio verificato.";

  if (readinessLabel === "not_ready") {
    headline = "Dossier non ancora pronto per revisione";
    subheadline =
      "Carica e analizza i PDF, poi conferma le bozze AI per costruire una base affidabile.";
  } else if (readinessLabel === "incomplete") {
    headline = "Completa il dossier assicurativo";
    subheadline =
      "Ogni voce della checklist avvicina il portafoglio a un pre-check con revisore esterno.";
  } else if (readinessLabel === "pre_check") {
    headline = "Dossier in buona preparazione";
    subheadline =
      "Il portafoglio è strutturato; risolvi le azioni prioritarie prima di una futura revisione.";
  } else {
    headline = "Dossier ben strutturato";
    subheadline =
      "Il servizio consulenza resta in preparazione — nessuna prenotazione attiva in questa versione.";
  }

  const blockers = buildBlockersFromChecklist(checklist);

  return {
    readiness: {
      percent: readinessPercent,
      label: readinessLabel,
      labelText: readinessLabelText[readinessLabel],
      headline,
      subheadline,
      blockers,
    },
    checklist,
    expertTopics: buildExpertReviewTopics(
      policies,
      documents,
      progression.completeness,
      kpis,
      progression,
      recommendations
    ),
    futureModules: consultingFutureModules,
    snapshot: buildSnapshot(
      policies,
      documents,
      kpis,
      recommendations,
      market.readiness.percent,
      market.readiness.labelText
    ),
    progression,
    kpis,
    recommendations,
    hasPortfolio: policies.length > 0 || documents.length > 0,
    hasInsufficientData: policies.length === 0 && documents.length === 0,
  };
}

export const getConsultingIntelligence = cache(async (): Promise<ConsultingIntelligence> => {
  const [policies, documents] = await Promise.all([
    getCurrentUserPolicies(),
    getCurrentUserDocuments(),
  ]);

  return computeConsultingIntelligence(policies, documents);
});
