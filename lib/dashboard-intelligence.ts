import "server-only";

import { cache } from "react";
import {
  getHealthPolicyGroupedView,
  hasHealthPolicyDetailData,
} from "@/lib/policy-health-grouping";
import {
  getPolicyCoverages,
  getPolicyInsuredPeople,
  getPolicyTypeLabel,
} from "@/lib/policy-types";
import { getCurrentUserPolicies } from "@/lib/policies";
import { getCurrentUserDocuments } from "@/lib/documents";
import type {
  PolicyPremiumFrequency,
  TypedPolicyType,
  UserDocument,
  UserPolicy,
} from "@/lib/types";

const EXTRACTION_CONFIDENCE_ALERT_THRESHOLD = 60;

export type DashboardAlertSeverity = "low" | "medium" | "high";

export type DashboardAlert = {
  id: string;
  title: string;
  severity: DashboardAlertSeverity;
  explanation: string;
  policyId?: string;
  documentId?: string;
  ctaLabel: string;
  ctaHref: string;
};

export type DashboardHealthFactor = {
  label: string;
  detail: string;
  impact: "positive" | "negative" | "neutral";
};

export type DashboardHealthScore = {
  available: boolean;
  score: number | null;
  label: "Da completare" | "Da rivedere" | "Buona base" | null;
  factors: DashboardHealthFactor[];
  disclaimer: string;
};

export type DashboardPortfolioKpis = {
  totalPolicies: number;
  totalDocuments: number;
  policiesRequiringReview: number;
  confirmedPolicies: number;
  totalMonthlyPremium: number | null;
  totalAnnualPremium: number | null;
  insuredPeopleCount: number;
  coverageCount: number;
  unassignedCoverageCount: number;
  averageExtractionConfidence: number | null;
  analyzedDocuments: number;
  processingDocuments: number;
  uploadedDocumentsAwaitingAnalysis: number;
  failedDocuments: number;
};

export type DashboardWorkflowStep = {
  id: string;
  label: string;
  status: "done" | "current" | "upcoming";
  detail: string;
};

export type DashboardIntelligence = {
  kpis: DashboardPortfolioKpis;
  healthScore: DashboardHealthScore;
  alerts: DashboardAlert[];
  workflowSteps: DashboardWorkflowStep[];
  marketPrerequisiteCount: number;
  recommendationsAvailable: boolean;
};

function toMonthlyPremium(
  amount: number,
  frequency: PolicyPremiumFrequency
): number {
  switch (frequency) {
    case "quarterly":
      return amount / 3;
    case "semiannual":
      return amount / 6;
    case "annual":
      return amount / 12;
    default:
      return amount;
  }
}

function getPolicyMonthlyPremium(policy: UserPolicy): number | null {
  if (
    policy.premiumAmount !== null &&
    Number.isFinite(policy.premiumAmount) &&
    policy.premiumAmount > 0
  ) {
    return toMonthlyPremium(policy.premiumAmount, policy.premiumFrequency);
  }

  const summary = policy.details.premium_summary;
  const summaryMonthly =
    summary?.final_monthly ?? summary?.total_monthly ?? null;

  if (
    summaryMonthly !== null &&
    Number.isFinite(summaryMonthly) &&
    summaryMonthly > 0
  ) {
    return summaryMonthly;
  }

  return null;
}

function policyHasDeductibleOrFranchise(policy: UserPolicy): boolean {
  if (policy.deductible !== null && Number.isFinite(policy.deductible)) {
    return true;
  }

  const details = policy.details;
  if (
    (details.deductible !== null && details.deductible !== undefined) ||
    (details.franchise !== null && details.franchise !== undefined)
  ) {
    return true;
  }

  return getPolicyCoverages(details).some(
    (coverage) =>
      (coverage.deductible !== null && coverage.deductible !== undefined) ||
      (coverage.franchise !== null && coverage.franchise !== undefined)
  );
}

function countPortfolioEntities(policies: UserPolicy[]) {
  let insuredPeopleCount = 0;
  let coverageCount = 0;
  let unassignedCoverageCount = 0;

  for (const policy of policies) {
    insuredPeopleCount += getPolicyInsuredPeople(policy.details).length;
    coverageCount += getPolicyCoverages(policy.details).length;

    if (
      policy.policyType === "health" &&
      hasHealthPolicyDetailData(policy.details)
    ) {
      const grouped = getHealthPolicyGroupedView(
        policy.details,
        getPolicyMonthlyPremium(policy)
      );
      unassignedCoverageCount += grouped.unassignedCoverages.length;
    } else {
      unassignedCoverageCount += getPolicyCoverages(policy.details).filter(
        (coverage) =>
          coverage.uncertain === true ||
          (coverage.ownership_confidence !== null &&
            coverage.ownership_confidence !== undefined &&
            coverage.ownership_confidence < 70)
      ).length;
    }
  }

  return { insuredPeopleCount, coverageCount, unassignedCoverageCount };
}

function getAverageExtractionConfidence(policies: UserPolicy[]): number | null {
  const values = policies
    .map((policy) => policy.extractionConfidence)
    .filter(
      (value): value is number =>
        value !== null && Number.isFinite(value) && value >= 0
    );

  if (values.length === 0) {
    return null;
  }

  return Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length
  );
}

function computePremiumTotals(policies: UserPolicy[]) {
  const confirmed = policies.filter((policy) => !policy.requiresReview);
  const monthlyValues = confirmed
    .map(getPolicyMonthlyPremium)
    .filter((value): value is number => value !== null);

  if (monthlyValues.length === 0) {
    return { totalMonthlyPremium: null, totalAnnualPremium: null };
  }

  const totalMonthlyPremium = monthlyValues.reduce((sum, value) => sum + value, 0);

  return {
    totalMonthlyPremium,
    totalAnnualPremium: totalMonthlyPremium * 12,
  };
}

function findDuplicatePolicyTypes(policies: UserPolicy[]): TypedPolicyType[] {
  const counts = new Map<TypedPolicyType, number>();

  for (const policy of policies.filter((item) => !item.requiresReview)) {
    counts.set(policy.policyType, (counts.get(policy.policyType) ?? 0) + 1);
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([type]) => type);
}

function buildWorkflowSteps(
  documents: UserDocument[],
  policies: UserPolicy[]
): DashboardWorkflowStep[] {
  const hasDocuments = documents.length > 0;
  const hasAnalyzedDocument = documents.some((doc) => doc.status === "analyzed");
  const hasPolicy = policies.length > 0;
  const hasConfirmedPolicy = policies.some((policy) => !policy.requiresReview);
  const pendingReview = policies.filter((policy) => policy.requiresReview).length;

  const uploadStatus: DashboardWorkflowStep["status"] = hasDocuments
    ? "done"
    : "current";
  const analyzeStatus: DashboardWorkflowStep["status"] = !hasDocuments
    ? "upcoming"
    : hasAnalyzedDocument
      ? "done"
      : "current";
  const structureStatus: DashboardWorkflowStep["status"] = !hasAnalyzedDocument
    ? "upcoming"
    : hasPolicy
      ? "done"
      : "current";
  const reviewStatus: DashboardWorkflowStep["status"] = !hasPolicy
    ? "upcoming"
    : pendingReview === 0
      ? "done"
      : hasConfirmedPolicy
        ? "current"
        : "current";
  const readyStatus: DashboardWorkflowStep["status"] =
    hasConfirmedPolicy && pendingReview === 0 ? "done" : "upcoming";

  return [
    {
      id: "upload",
      label: "Carica documenti",
      status: uploadStatus,
      detail: hasDocuments
        ? `${documents.length} file nell'archivio`
        : "Carica il primo PDF assicurativo",
    },
    {
      id: "analyze",
      label: "Analisi documenti",
      status: analyzeStatus,
      detail: hasAnalyzedDocument
        ? `${documents.filter((doc) => doc.status === "analyzed").length} documenti analizzati`
        : "Estrai testo e dati strutturati",
    },
    {
      id: "structure",
      label: "Polizze strutturate",
      status: structureStatus,
      detail: hasPolicy
        ? `${policies.length} schede create`
        : "Crea la prima polizza da un PDF",
    },
    {
      id: "review",
      label: "Revisione e conferma",
      status: reviewStatus,
      detail:
        pendingReview > 0
          ? `${pendingReview} bozza${pendingReview === 1 ? "" : "e"} da confermare`
          : "Dati verificati nel portafoglio",
    },
    {
      id: "intelligence",
      label: "Analisi attiva",
      status: readyStatus,
      detail: hasConfirmedPolicy
        ? "KPI e alert dal portafoglio"
        : "Servono polizze confermate",
    },
  ];
}

export function computeDashboardHealthScore(
  policies: UserPolicy[],
  documents: UserDocument[]
): DashboardHealthScore {
  const disclaimer =
    "Score basato solo sui dati caricati e verificati.";

  if (policies.length === 0) {
    return {
      available: false,
      score: null,
      label: null,
      factors: [
        {
          label: "Portafoglio vuoto",
          detail: "Carica e analizza almeno una polizza per calcolare lo score.",
          impact: "neutral",
        },
      ],
      disclaimer,
    };
  }

  const confirmed = policies.filter((policy) => !policy.requiresReview);
  const requiringReview = policies.filter((policy) => policy.requiresReview);
  const { unassignedCoverageCount } = countPortfolioEntities(policies);
  const duplicateTypes = findDuplicatePolicyTypes(policies);

  const confirmedRatio = confirmed.length / policies.length;
  const withPremium = confirmed.filter(
    (policy) => getPolicyMonthlyPremium(policy) !== null
  ).length;
  const withRenewal = confirmed.filter((policy) => policy.renewalDate).length;
  const withDeductible = confirmed.filter(policyHasDeductibleOrFranchise).length;
  const withDocument = policies.filter((policy) => policy.documentId).length;
  const avgConfidence = getAverageExtractionConfidence(policies);

  let score = 0;
  const factors: DashboardHealthFactor[] = [];

  const confirmedPoints = Math.round(confirmedRatio * 30);
  score += confirmedPoints;
  factors.push({
    label: "Polizze confermate",
    detail: `${confirmed.length} su ${policies.length} confermate (+${confirmedPoints} pt)`,
    impact: confirmedRatio >= 0.8 ? "positive" : "negative",
  });

  const reviewPoints = Math.round((1 - requiringReview.length / policies.length) * 20);
  score += reviewPoints;
  if (requiringReview.length > 0) {
    factors.push({
      label: "Revisioni in sospeso",
      detail: `${requiringReview.length} bozza${requiringReview.length === 1 ? "" : "e"} da rivedere (+${reviewPoints} pt)`,
      impact: "negative",
    });
  } else {
    factors.push({
      label: "Nessuna bozza in attesa",
      detail: `Tutte le schede sono state revisionate (+${reviewPoints} pt)`,
      impact: "positive",
    });
  }

  const completenessDenominator = Math.max(confirmed.length, 1);
  const premiumRatio = withPremium / completenessDenominator;
  const renewalRatio = withRenewal / completenessDenominator;
  const deductibleRatio = withDeductible / completenessDenominator;
  const completenessRatio =
    (premiumRatio + renewalRatio + deductibleRatio) / 3;
  const completenessPoints = Math.round(completenessRatio * 25);
  score += completenessPoints;
  factors.push({
    label: "Completezza dati",
    detail: `Premio ${withPremium}/${confirmed.length || 0}, rinnovo ${withRenewal}/${confirmed.length || 0}, franchigia ${withDeductible}/${confirmed.length || 0} (+${completenessPoints} pt)`,
    impact: completenessRatio >= 0.66 ? "positive" : "negative",
  });

  if (avgConfidence !== null) {
    const confidencePoints = Math.round((avgConfidence / 100) * 15);
    score += confidencePoints;
    factors.push({
      label: "Confidenza estrazione",
      detail: `Media ${avgConfidence}% sulle polizze con score AI (+${confidencePoints} pt)`,
      impact: avgConfidence >= 70 ? "positive" : "negative",
    });
  } else {
    factors.push({
      label: "Confidenza estrazione",
      detail: "Nessun valore di confidenza disponibile (0 pt)",
      impact: "neutral",
    });
  }

  const documentRatio = withDocument / policies.length;
  const documentPoints = Math.round(documentRatio * 10);
  score += documentPoints;
  factors.push({
    label: "Documenti collegati",
    detail: `${withDocument} polizza${withDocument === 1 ? "" : "e"} con PDF collegato (+${documentPoints} pt)`,
    impact: documentRatio >= 0.8 ? "positive" : "neutral",
  });

  const unassignedPenalty = Math.min(10, unassignedCoverageCount * 2);
  score += Math.max(0, 10 - unassignedPenalty);
  if (unassignedCoverageCount > 0) {
    factors.push({
      label: "Coperture non assegnate",
      detail: `${unassignedCoverageCount} righe da verificare (-${unassignedPenalty} pt)`,
      impact: "negative",
    });
  } else if (countPortfolioEntities(policies).coverageCount > 0) {
    factors.push({
      label: "Coperture assegnate",
      detail: "Nessuna copertura incerta rilevata (+10 pt)",
      impact: "positive",
    });
  }

  if (duplicateTypes.length > 0) {
    const duplicatePenalty = Math.min(10, duplicateTypes.length * 4);
    score = Math.max(0, score - duplicatePenalty);
    factors.push({
      label: "Possibili duplicati di categoria",
      detail: `${duplicateTypes.map((type) => getPolicyTypeLabel(type)).join(", ")} (-${duplicatePenalty} pt)`,
      impact: "negative",
    });
  }

  if (documents.length === 0 && policies.length > 0) {
    score = Math.max(0, score - 5);
    factors.push({
      label: "Archivio documenti",
      detail: "Polizze senza PDF in archivio (-5 pt)",
      impact: "negative",
    });
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  let label: DashboardHealthScore["label"];
  if (confirmed.length === 0) {
    label = "Da completare";
  } else if (requiringReview.length > 0 || finalScore < 55) {
    label = "Da rivedere";
  } else if (finalScore >= 55) {
    label = "Buona base";
  } else {
    label = "Da rivedere";
  }

  return {
    available: true,
    score: finalScore,
    label,
    factors,
    disclaimer,
  };
}

export function buildDashboardAlerts(
  policies: UserPolicy[],
  documents: UserDocument[]
): DashboardAlert[] {
  const alerts: DashboardAlert[] = [];

  for (const policy of policies) {
    const policyLabel = policy.provider || "Polizza";

    if (policy.requiresReview) {
      alerts.push({
        id: `review-${policy.id}`,
        title: "Bozza AI da confermare",
        severity: "high",
        explanation: `${policyLabel} richiede revisione manuale dei campi estratti.`,
        policyId: policy.id,
        ctaLabel: "Rivedi polizza",
        ctaHref: `/policies/${policy.id}/edit`,
      });
    }

    if (!policy.requiresReview && !policy.renewalDate) {
      alerts.push({
        id: `renewal-${policy.id}`,
        title: "Data di rinnovo mancante",
        severity: "medium",
        explanation: `Aggiungi la scadenza per ${policyLabel} per monitorare i rinnovi.`,
        policyId: policy.id,
        ctaLabel: "Modifica polizza",
        ctaHref: `/policies/${policy.id}/edit`,
      });
    }

    if (!policy.requiresReview && getPolicyMonthlyPremium(policy) === null) {
      alerts.push({
        id: `premium-${policy.id}`,
        title: "Premio non disponibile",
        severity: "medium",
        explanation: `Il premio di ${policyLabel} non è stato estratto o confermato.`,
        policyId: policy.id,
        ctaLabel: "Completa premio",
        ctaHref: `/policies/${policy.id}/edit`,
      });
    }

    if (!policy.requiresReview && !policyHasDeductibleOrFranchise(policy)) {
      alerts.push({
        id: `deductible-${policy.id}`,
        title: "Franchigia / scoperto mancante",
        severity: "low",
        explanation: `Verifica franchigia o scoperto per ${policyLabel}.`,
        policyId: policy.id,
        ctaLabel: "Verifica dettagli",
        ctaHref: `/policies/${policy.id}`,
      });
    }

    if (
      policy.extractionConfidence !== null &&
      policy.extractionConfidence < EXTRACTION_CONFIDENCE_ALERT_THRESHOLD
    ) {
      alerts.push({
        id: `confidence-${policy.id}`,
        title: "Confidenza estrazione bassa",
        severity: "medium",
        explanation: `${policyLabel} ha confidenza ${Math.round(policy.extractionConfidence)}%: controlla i campi incerti.`,
        policyId: policy.id,
        ctaLabel: "Rivedi estrazione",
        ctaHref: `/policies/${policy.id}/edit`,
      });
    }

    if (!policy.documentId) {
      alerts.push({
        id: `document-link-${policy.id}`,
        title: "Polizza senza documento collegato",
        severity: "low",
        explanation: `${policyLabel} non ha un PDF di origine nell'archivio.`,
        policyId: policy.id,
        ctaLabel: "Collega documento",
        ctaHref: `/policies/${policy.id}/edit`,
      });
    }

    if (
      policy.policyType === "health" &&
      hasHealthPolicyDetailData(policy.details)
    ) {
      const grouped = getHealthPolicyGroupedView(
        policy.details,
        getPolicyMonthlyPremium(policy)
      );
      if (grouped.unassignedCoverages.length > 0) {
        alerts.push({
          id: `unassigned-${policy.id}`,
          title: "Coperture salute non assegnate",
          severity: "medium",
          explanation: `${grouped.unassignedCoverages.length} copertura${grouped.unassignedCoverages.length === 1 ? "" : "e"} da assegnare su ${policyLabel}.`,
          policyId: policy.id,
          ctaLabel: "Apri revisione",
          ctaHref: `/policies/${policy.id}`,
        });
      }
    }
  }

  const duplicateTypes = findDuplicatePolicyTypes(policies);
  for (const type of duplicateTypes) {
    const matching = policies.filter(
      (policy) => !policy.requiresReview && policy.policyType === type
    );
    alerts.push({
      id: `duplicate-${type}`,
      title: "Possibile doppia copertura",
      severity: "medium",
      explanation: `${matching.length} polizze confermate di tipo ${getPolicyTypeLabel(type)}: verifica sovrapposizioni.`,
      ctaLabel: "Vedi polizze",
      ctaHref: "/policies",
    });
  }

  const linkedDocumentIds = new Set(
    policies
      .map((policy) => policy.documentId)
      .filter((id): id is string => Boolean(id))
  );

  for (const document of documents) {
    if (document.status === "analyzed" && !linkedDocumentIds.has(document.id)) {
      alerts.push({
        id: `orphan-doc-${document.id}`,
        title: "Documento senza polizza",
        severity: "medium",
        explanation:
          "Un documento analizzato non è ancora collegato a una scheda polizza.",
        documentId: document.id,
        ctaLabel: "Crea polizza",
        ctaHref: `/policies/new?documentId=${document.id}`,
      });
    }

    if (document.status === "failed") {
      alerts.push({
        id: `failed-doc-${document.id}`,
        title: "Analisi documento fallita",
        severity: "high",
        explanation: "L'analisi di un documento non è riuscita. Verifica il PDF e riprova.",
        documentId: document.id,
        ctaLabel: "Apri documento",
        ctaHref: `/documents/${document.id}`,
      });
    }
  }

  const severityOrder: Record<DashboardAlertSeverity, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return alerts.sort(
    (left, right) => severityOrder[left.severity] - severityOrder[right.severity]
  );
}

export function computeDashboardIntelligence(
  policies: UserPolicy[],
  documents: UserDocument[]
): DashboardIntelligence {
  const { insuredPeopleCount, coverageCount, unassignedCoverageCount } =
    countPortfolioEntities(policies);
  const premiumTotals = computePremiumTotals(policies);
  const confirmedPolicies = policies.filter((policy) => !policy.requiresReview)
    .length;

  const kpis: DashboardPortfolioKpis = {
    totalPolicies: policies.length,
    totalDocuments: documents.length,
    policiesRequiringReview: policies.filter((policy) => policy.requiresReview)
      .length,
    confirmedPolicies,
    ...premiumTotals,
    insuredPeopleCount,
    coverageCount,
    unassignedCoverageCount,
    averageExtractionConfidence: getAverageExtractionConfidence(policies),
    analyzedDocuments: documents.filter((doc) => doc.status === "analyzed").length,
    processingDocuments: documents.filter((doc) => doc.status === "processing")
      .length,
    uploadedDocumentsAwaitingAnalysis: documents.filter(
      (doc) => doc.status === "uploaded"
    ).length,
    failedDocuments: documents.filter((doc) => doc.status === "failed").length,
  };

  return {
    kpis,
    healthScore: computeDashboardHealthScore(policies, documents),
    alerts: buildDashboardAlerts(policies, documents),
    workflowSteps: buildWorkflowSteps(documents, policies),
    marketPrerequisiteCount: confirmedPolicies,
    recommendationsAvailable: false,
  };
}

export const getDashboardIntelligence = cache(async () => {
  const [policies, documents] = await Promise.all([
    getCurrentUserPolicies(),
    getCurrentUserDocuments(),
  ]);

  return computeDashboardIntelligence(policies, documents);
});
