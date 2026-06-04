import "server-only";

import { cache } from "react";
import { computeDashboardIntelligence } from "@/lib/dashboard-intelligence";
import {
  getPolicyCoverages,
  getPolicyInsuredPeople,
} from "@/lib/policy-types";
import {
  getHealthPolicyGroupedView,
  hasHealthPolicyDetailData,
} from "@/lib/policy-health-grouping";
import { getCurrentUserDocuments } from "@/lib/documents";
import { getCurrentUserPolicies } from "@/lib/policies";
import type { UserDocument, UserPolicy } from "@/lib/types";

export type PortfolioMaturity =
  | "empty"
  | "starting"
  | "building"
  | "verified"
  | "advanced";

export type ProgressionStepStatus = "done" | "current" | "upcoming";

export type ProgressionMilestone = {
  id: string;
  order: number;
  label: string;
  description: string;
  status: ProgressionStepStatus;
  ctaLabel?: string;
  ctaHref?: string;
};

export type CompletenessMetric = {
  id: string;
  label: string;
  percent: number | null;
  detail: string;
  status: "complete" | "partial" | "empty";
};

export type ModuleUnlockId = "analysis" | "recommendations" | "market";

export type ModuleUnlock = {
  id: ModuleUnlockId;
  label: string;
  unlocked: boolean;
  requirement: string;
  progressDetail: string;
  ctaLabel: string;
  ctaHref: string;
};

export type PortfolioProgression = {
  maturity: PortfolioMaturity;
  maturityLabel: string;
  headline: string;
  subheadline: string;
  overallPercent: number;
  portfolioReadinessPercent: number;
  intelligenceReadinessPercent: number;
  analysisReadinessPercent: number;
  milestones: ProgressionMilestone[];
  completeness: CompletenessMetric[];
  unlocks: ModuleUnlock[];
  nextStep: ProgressionMilestone | null;
  completedMilestones: number;
  totalMilestones: number;
  showOnboardingFocus: boolean;
};

const MARKET_UNLOCK_CONFIRMED = 3;

function percent(part: number, total: number): number | null {
  if (total <= 0) {
    return null;
  }
  return Math.round((part / total) * 100);
}

function averagePercents(values: Array<number | null>): number {
  const valid = values.filter(
    (value): value is number => value !== null && Number.isFinite(value)
  );
  if (valid.length === 0) {
    return 0;
  }
  return Math.round(valid.reduce((sum, value) => sum + value, 0) / valid.length);
}

function countEntities(policies: UserPolicy[]) {
  let insuredPeople = 0;
  let coverages = 0;
  let unassigned = 0;

  for (const policy of policies) {
    insuredPeople += getPolicyInsuredPeople(policy.details).length;
    coverages += getPolicyCoverages(policy.details).length;

    if (
      policy.policyType === "health" &&
      hasHealthPolicyDetailData(policy.details)
    ) {
      const grouped = getHealthPolicyGroupedView(
        policy.details,
        policy.premiumAmount
      );
      unassigned += grouped.unassignedCoverages.length;
    } else {
      unassigned += getPolicyCoverages(policy.details).filter(
        (coverage) =>
          coverage.uncertain === true ||
          (coverage.ownership_confidence !== null &&
            coverage.ownership_confidence !== undefined &&
            coverage.ownership_confidence < 70)
      ).length;
    }
  }

  return { insuredPeople, coverages, unassigned };
}

/** True only when the portfolio has coverages and none remain unassigned. */
function areCoverageAssignmentsComplete(policies: UserPolicy[]): boolean {
  if (policies.length === 0) {
    return false;
  }

  const { coverages, unassigned } = countEntities(policies);

  if (coverages === 0) {
    return false;
  }

  return unassigned === 0;
}

function policyHasPremium(policy: UserPolicy): boolean {
  if (
    policy.premiumAmount !== null &&
    Number.isFinite(policy.premiumAmount) &&
    policy.premiumAmount > 0
  ) {
    return true;
  }
  const summary = policy.details.premium_summary;
  return Boolean(
    summary?.final_monthly ?? summary?.total_monthly ?? summary?.total_annual
  );
}

function buildCompleteness(
  policies: UserPolicy[],
  documents: UserDocument[]
): CompletenessMetric[] {
  const confirmed = policies.filter((policy) => !policy.requiresReview);
  const analyzedDocs = documents.filter((doc) => doc.status === "analyzed");
  const linkedPolicies = policies.filter((policy) => policy.documentId);
  const { insuredPeople, coverages, unassigned } = countEntities(policies);

  const metrics: CompletenessMetric[] = [
    {
      id: "documents-analyzed",
      label: "Documenti analizzati",
      percent: percent(analyzedDocs.length, documents.length),
      detail:
        documents.length > 0
          ? `${analyzedDocs.length} di ${documents.length} PDF`
          : "Nessun PDF caricato",
      status:
        documents.length === 0
          ? "empty"
          : analyzedDocs.length === documents.length
            ? "complete"
            : "partial",
    },
    {
      id: "policies-structured",
      label: "Polizze strutturate",
      percent:
        documents.length > 0
          ? percent(policies.length, Math.max(analyzedDocs.length, 1))
          : policies.length > 0
            ? 100
            : null,
      detail:
        policies.length > 0
          ? confirmed.length > 0
            ? `${policies.length} scheda${policies.length === 1 ? "" : "e"} · ${confirmed.length} confermata${confirmed.length === 1 ? "" : "e"}`
            : `${policies.length} bozza${policies.length === 1 ? "" : "e"} da confermare`
          : "In attesa di estrazione",
      status:
        policies.length === 0
          ? "empty"
          : confirmed.length > 0
            ? "complete"
            : "partial",
    },
    {
      id: "policies-confirmed",
      label: "Polizze confermate",
      percent: percent(confirmed.length, policies.length),
      detail:
        policies.length > 0
          ? `${confirmed.length} di ${policies.length} verificate`
          : "Conferma le bozze AI",
      status:
        policies.length === 0
          ? "empty"
          : confirmed.length === policies.length
            ? "complete"
            : "partial",
    },
    {
      id: "documents-linked",
      label: "PDF collegati",
      percent: percent(linkedPolicies.length, policies.length),
      detail:
        policies.length > 0
          ? `${linkedPolicies.length} polizza${linkedPolicies.length === 1 ? "" : "e"} con origine`
          : "—",
      status:
        policies.length === 0
          ? "empty"
          : linkedPolicies.length === policies.length
            ? "complete"
            : "partial",
    },
    {
      id: "people-identified",
      label: "Persone identificate",
      percent: insuredPeople > 0 ? 100 : policies.length > 0 ? 0 : null,
      detail:
        insuredPeople > 0
          ? `${insuredPeople} persona${insuredPeople === 1 ? "" : "e"} estratta${insuredPeople === 1 ? "" : "e"}`
          : policies.length > 0
            ? "Da verificare nell'estrazione"
            : "—",
      status: insuredPeople > 0 ? "complete" : policies.length > 0 ? "partial" : "empty",
    },
    {
      id: "coverages-assigned",
      label: "Coperture assegnate",
      percent:
        coverages > 0
          ? percent(coverages - unassigned, coverages)
          : null,
      detail:
        coverages > 0
          ? unassigned > 0
            ? `${unassigned} da assegnare`
            : "Tutte assegnate"
          : "—",
      status:
        coverages === 0
          ? "empty"
          : unassigned === 0
            ? "complete"
            : "partial",
    },
    {
      id: "premium-complete",
      label: "Premi compilati",
      percent:
        confirmed.length > 0
          ? percent(
              confirmed.filter(policyHasPremium).length,
              confirmed.length
            )
          : null,
      detail:
        confirmed.length > 0
          ? `${confirmed.filter(policyHasPremium).length} di ${confirmed.length} con premio`
          : "—",
      status:
        confirmed.length === 0
          ? "empty"
          : confirmed.every(policyHasPremium)
            ? "complete"
            : "partial",
    },
    {
      id: "renewal-complete",
      label: "Date di rinnovo",
      percent:
        confirmed.length > 0
          ? percent(
              confirmed.filter((policy) => policy.renewalDate).length,
              confirmed.length
            )
          : null,
      detail:
        confirmed.length > 0
          ? `${confirmed.filter((policy) => policy.renewalDate).length} di ${confirmed.length} con scadenza`
          : "—",
      status:
        confirmed.length === 0
          ? "empty"
          : confirmed.every((policy) => policy.renewalDate)
            ? "complete"
            : "partial",
    },
  ];

  return metrics;
}

function buildMilestones(
  policies: UserPolicy[],
  documents: UserDocument[]
): ProgressionMilestone[] {
  const hasDocuments = documents.length > 0;
  const hasAnalyzed = documents.some((doc) => doc.status === "analyzed");
  const hasPolicy = policies.length > 0;
  const hasConfirmed = policies.some((policy) => !policy.requiresReview);
  const pendingReview = policies.filter((policy) => policy.requiresReview);
  const firstPending = pendingReview[0];

  const raw: Array<Omit<ProgressionMilestone, "status" | "order"> & { done: boolean }> = [
    {
      id: "upload",
      done: hasDocuments,
      label: "Carica il primo documento",
      description: "Archivia un PDF assicurativo svizzero nel workspace privato.",
      ctaLabel: "Carica PDF",
      ctaHref: "/documents",
    },
    {
      id: "analyze",
      done: hasAnalyzed,
      label: "Completa l'estrazione AI",
      description: "Avvia l'analisi OCR per strutturare i dati della polizza.",
      ctaLabel: "Vai ai documenti",
      ctaHref: "/documents",
    },
    {
      id: "structure",
      done: hasPolicy,
      label: "Crea la prima scheda polizza",
      description: "Atlas genera una bozza strutturata dal documento analizzato.",
      ctaLabel: "Vedi polizze",
      ctaHref: "/policies",
    },
    {
      id: "confirm",
      done: hasConfirmed,
      label: "Conferma la bozza AI",
      description: "Verifica premio, persone e coperture per considerare i dati affidabili.",
      ctaLabel: firstPending ? "Rivedi bozza" : "Apri polizze",
      ctaHref: firstPending
        ? `/policies/${firstPending.id}/edit`
        : "/policies",
    },
    {
      id: "expand",
      done: policies.length >= 2 || documents.length >= 2,
      label: "Amplia il portafoglio",
      description: "Aggiungi altre polizze per coperture e categorie più complete.",
      ctaLabel: "Carica altro PDF",
      ctaHref: "/documents",
    },
    {
      id: "assign",
      done: areCoverageAssignmentsComplete(policies),
      label: "Completa le assegnazioni",
      description: "Collega ogni copertura alla persona assicurata corretta.",
      ctaLabel: "Rivedi coperture",
      ctaHref: "/policies",
    },
    {
      id: "intelligence",
      done: hasConfirmed && policies.length >= 1,
      label: "Sblocca l'intelligence",
      description: "Analisi, raccomandazioni e alert basati su dati verificati.",
      ctaLabel: "Apri analisi",
      ctaHref: "/analysis",
    },
  ];

  let foundCurrent = false;
  return raw.map(({ done, ...milestone }, index) => {
    let status: ProgressionStepStatus;
    if (done) {
      status = "done";
    } else if (!foundCurrent) {
      status = "current";
      foundCurrent = true;
    } else {
      status = "upcoming";
    }

    return {
      ...milestone,
      order: index + 1,
      status,
    };
  });
}

function resolveMaturity(
  policies: UserPolicy[],
  documents: UserDocument[],
  overallPercent: number,
  confirmedCount: number
): PortfolioMaturity {
  if (documents.length === 0 && policies.length === 0) {
    return "empty";
  }
  if (confirmedCount === 0) {
    return "starting";
  }
  if (confirmedCount < MARKET_UNLOCK_CONFIRMED || overallPercent < 70) {
    return "building";
  }
  if (overallPercent >= 85 && policies.length >= MARKET_UNLOCK_CONFIRMED) {
    return "advanced";
  }
  return "verified";
}

const maturityLabels: Record<PortfolioMaturity, string> = {
  empty: "Inizio percorso",
  starting: "Configurazione in corso",
  building: "Portafoglio in crescita",
  verified: "Dati verificati",
  advanced: "Portfolio strutturato",
};

export function computePortfolioProgression(
  policies: UserPolicy[],
  documents: UserDocument[]
): PortfolioProgression {
  const dashboard = computeDashboardIntelligence(policies, documents);
  const { kpis } = dashboard;
  const confirmed = policies.filter((policy) => !policy.requiresReview);
  const completeness = buildCompleteness(policies, documents);
  const milestones = buildMilestones(policies, documents);

  const overallPercent = averagePercents(
    completeness.map((metric) => metric.percent)
  );

  const portfolioReadinessPercent = averagePercents([
    percent(documents.filter((doc) => doc.status === "analyzed").length, documents.length),
    percent(confirmed.length, Math.max(policies.length, 1)),
    percent(
      policies.filter((policy) => policy.documentId).length,
      Math.max(policies.length, 1)
    ),
  ]);

  const intelligenceReadinessPercent =
    confirmed.length === 0
      ? Math.round(
          averagePercents([
            percent(documents.length > 0 ? 1 : 0, 1),
            percent(policies.length > 0 ? 1 : 0, 1),
          ]) * 0.7
        )
      : averagePercents([
          percent(confirmed.length, policies.length),
          overallPercent,
          kpis.coverageCount > 0
            ? percent(
                kpis.coverageCount - kpis.unassignedCoverageCount,
                kpis.coverageCount
              )
            : null,
        ]);

  const analysisReadinessPercent =
    confirmed.length > 0 ? Math.min(100, intelligenceReadinessPercent) : 0;

  const maturity = resolveMaturity(
    policies,
    documents,
    overallPercent,
    confirmed.length
  );

  const analysisUnlocked = confirmed.length >= 1;
  const recommendationsUnlocked = confirmed.length >= 1;
  const marketUnlocked = confirmed.length >= MARKET_UNLOCK_CONFIRMED;

  const unlocks: ModuleUnlock[] = [
    {
      id: "analysis",
      label: "Centro analisi",
      unlocked: analysisUnlocked,
      requirement: "Conferma almeno 1 polizza",
      progressDetail: analysisUnlocked
        ? "Attivo sui dati verificati"
        : `${confirmed.length} di 1 polizza confermata`,
      ctaLabel: analysisUnlocked ? "Apri analisi" : "Conferma bozza",
      ctaHref: analysisUnlocked
        ? "/analysis"
        : pendingReviewHref(policies),
    },
    {
      id: "recommendations",
      label: "Raccomandazioni",
      unlocked: recommendationsUnlocked,
      requirement: "Almeno 1 polizza strutturata",
      progressDetail: recommendationsUnlocked
        ? "Azioni basate sul portafoglio reale"
        : "Carica e struttura una polizza",
      ctaLabel: recommendationsUnlocked ? "Vedi azioni" : "Carica PDF",
      ctaHref: recommendationsUnlocked ? "/recommendations" : "/documents",
    },
    {
      id: "market",
      label: "Confronto mercato",
      unlocked: marketUnlocked,
      requirement: `${MARKET_UNLOCK_CONFIRMED} polizze confermate`,
      progressDetail: marketUnlocked
        ? "Pronto per benchmark futuro"
        : `${confirmed.length} di ${MARKET_UNLOCK_CONFIRMED} confermate`,
      ctaLabel: marketUnlocked ? "Vedi modulo" : "Completa portafoglio",
      ctaHref: "/market",
    },
  ];

  const nextStep =
    milestones.find((step) => step.status === "current") ?? null;

  const completedMilestones = milestones.filter(
    (step) => step.status === "done"
  ).length;

  const showOnboardingFocus =
    maturity === "empty" || maturity === "starting" || overallPercent < 55;

  let headline = "Costruisci il tuo ecosistema assicurativo";
  let subheadline =
    "Atlas guida ogni passo: documenti, estrazione, conferma e intelligence verificata.";

  if (maturity === "empty") {
    headline = "Benvenuto in Atlas";
    subheadline =
      "Carica la tua prima polizza per avviare l'estrazione AI e il percorso guidato.";
  } else if (maturity === "starting") {
    headline = "Quasi pronto per l'intelligence";
    subheadline =
      "Conferma le bozze AI per sbloccare analisi, raccomandazioni e alert avanzati.";
  } else if (maturity === "advanced") {
    headline = "Portafoglio intelligence attivo";
    subheadline =
      "Continua ad arricchire i dati per migliorare completezza e qualità delle insight.";
  }

  return {
    maturity,
    maturityLabel: maturityLabels[maturity],
    headline,
    subheadline,
    overallPercent,
    portfolioReadinessPercent,
    intelligenceReadinessPercent,
    analysisReadinessPercent,
    milestones,
    completeness,
    unlocks,
    nextStep,
    completedMilestones,
    totalMilestones: milestones.length,
    showOnboardingFocus,
  };
}

function pendingReviewHref(policies: UserPolicy[]): string {
  const pending = policies.find((policy) => policy.requiresReview);
  return pending ? `/policies/${pending.id}/edit` : "/policies";
}

export const getPortfolioProgression = cache(async () => {
  const [policies, documents] = await Promise.all([
    getCurrentUserPolicies(),
    getCurrentUserDocuments(),
  ]);

  return computePortfolioProgression(policies, documents);
});
