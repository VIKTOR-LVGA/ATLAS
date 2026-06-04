/**
 * DEV/legacy unused — must not be used in authenticated production flows.
 * Policy drafts must come from real PDF text extraction only (see lib/document-analysis.ts).
 */

import type {
  Alert,
  AnalysisItem,
  Benchmark,
  Document,
  Policy,
  Recommendation,
  UserProfile,
} from "./types";

export const userProfile: UserProfile = {
  name: "Marco Bianchi",
  email: "marco.bianchi@email.ch",
  canton: "Ticino",
  memberSince: "2025-09-12",
};

export const dashboardStats = {
  annualPremium: 4830,
  coverageHealthScore: 72,
  activePolicies: 12,
  potentialSavings: { min: 1240, max: 1240 },
  savingsPercent: 26,
  alertsCount: 5,
  documentsTotal: 36,
  documentsAnalyzed: 32,
  ocrPercent: 98,
  marketUpdated: "24 maggio 2024",
};

const policyBase = (
  p: Omit<Policy, "includedCoverages" | "excludedCoverages" | "alerts" | "recommendations" | "documentIds"> & {
    includedCoverages?: string[];
    excludedCoverages?: string[];
    alerts?: Alert[];
    recommendations?: Recommendation[];
    documentIds?: string[];
  }
): Policy => ({
  includedCoverages: p.includedCoverages ?? ["Copertura standard"],
  excludedCoverages: p.excludedCoverages ?? ["Esclusioni generali"],
  alerts: p.alerts ?? [],
  recommendations: p.recommendations ?? [],
  documentIds: p.documentIds ?? [],
  ...p,
});

export const policies: Policy[] = [
  policyBase({
    id: "pol-001",
    name: "RC Auto",
    policyNumber: "POL-2024-001",
    insurer: "AXA",
    category: "car",
    status: "active",
    healthStatus: "ok",
    annualPremium: 680,
    deductible: 1000,
    coverageScore: 85,
    renewalDate: "2026-06-15",
    daysUntilRenewal: 145,
    documentIds: ["doc-003"],
  }),
  policyBase({
    id: "pol-002",
    name: "Mobilia domestica",
    policyNumber: "POL-2024-002",
    insurer: "Zurich",
    category: "household",
    status: "review",
    healthStatus: "critical",
    annualPremium: 420,
    deductible: 500,
    coverageScore: 58,
    renewalDate: "2026-01-20",
    daysUntilRenewal: 28,
    documentIds: ["doc-004"],
    alerts: [
      {
        id: "a2",
        title: "Somma assicurata insufficiente",
        description: "Valore stimato superiore alla somma assicurata del 18%.",
        severity: "high",
      },
    ],
  }),
  policyBase({
    id: "pol-003",
    name: "RC Privata",
    policyNumber: "POL-2024-003",
    insurer: "Mobiliar",
    category: "liability",
    status: "active",
    healthStatus: "attention",
    annualPremium: 180,
    deductible: 0,
    coverageScore: 72,
    renewalDate: "2026-08-01",
    daysUntilRenewal: 210,
    documentIds: ["doc-005"],
  }),
  policyBase({
    id: "pol-004",
    name: "Salute complementare",
    policyNumber: "POL-2024-004",
    insurer: "Helsana",
    category: "health",
    status: "active",
    healthStatus: "attention",
    annualPremium: 1240,
    deductible: 2500,
    coverageScore: 74,
    renewalDate: "2026-03-01",
    daysUntilRenewal: 98,
    documentIds: ["doc-001", "doc-002"],
  }),
  policyBase({
    id: "pol-005",
    name: "Protezione giuridica",
    policyNumber: "POL-2024-005",
    insurer: "Coop Rechtsschutz",
    category: "legal",
    status: "expiring",
    healthStatus: "attention",
    annualPremium: 290,
    deductible: 0,
    coverageScore: 71,
    renewalDate: "2025-12-01",
    daysUntilRenewal: 45,
    documentIds: ["doc-006"],
  }),
  policyBase({
    id: "pol-006",
    name: "Vita – rischio",
    policyNumber: "POL-2024-006",
    insurer: "Swiss Life",
    category: "life",
    status: "active",
    healthStatus: "ok",
    annualPremium: 890,
    deductible: 0,
    coverageScore: 88,
    renewalDate: "2027-01-01",
    daysUntilRenewal: 410,
    documentIds: ["doc-007"],
  }),
  policyBase({
    id: "pol-007",
    name: "Casco parziale auto",
    policyNumber: "POL-2024-007",
    insurer: "Allianz",
    category: "car",
    status: "active",
    healthStatus: "ok",
    annualPremium: 520,
    deductible: 800,
    coverageScore: 82,
    renewalDate: "2026-09-01",
    daysUntilRenewal: 180,
  }),
  policyBase({
    id: "pol-008",
    name: "Casa – edificio",
    policyNumber: "POL-2024-008",
    insurer: "Helvetia",
    category: "household",
    status: "active",
    healthStatus: "ok",
    annualPremium: 610,
    deductible: 300,
    coverageScore: 79,
    renewalDate: "2026-11-15",
    daysUntilRenewal: 255,
  }),
  policyBase({
    id: "pol-009",
    name: "Infortuni",
    policyNumber: "POL-2024-009",
    insurer: "Generali",
    category: "health",
    status: "active",
    healthStatus: "ok",
    annualPremium: 340,
    deductible: 0,
    coverageScore: 86,
    renewalDate: "2026-04-10",
    daysUntilRenewal: 72,
  }),
  policyBase({
    id: "pol-010",
    name: "Viaggio annuale",
    policyNumber: "POL-2024-010",
    insurer: "Zurich",
    category: "liability",
    status: "active",
    healthStatus: "ok",
    annualPremium: 120,
    deductible: 0,
    coverageScore: 90,
    renewalDate: "2026-07-01",
    daysUntilRenewal: 154,
  }),
  policyBase({
    id: "pol-011",
    name: "RC commerciale",
    policyNumber: "POL-2024-011",
    insurer: "AXA",
    category: "liability",
    status: "active",
    healthStatus: "ok",
    annualPremium: 450,
    deductible: 0,
    coverageScore: 84,
    renewalDate: "2026-05-20",
    daysUntilRenewal: 112,
  }),
  policyBase({
    id: "pol-012",
    name: "Previdenza 3a",
    policyNumber: "POL-2024-012",
    insurer: "Swiss Life",
    category: "life",
    status: "active",
    healthStatus: "ok",
    annualPremium: 240,
    deductible: 0,
    coverageScore: 91,
    renewalDate: "2026-12-31",
    daysUntilRenewal: 300,
  }),
];

export const alerts: Alert[] = [
  {
    id: "alert-1",
    title: "Possibile doppia copertura",
    description: "RC privata e RC mobilia potrebbero sovrapporsi. Verifica le esclusioni.",
    severity: "medium",
    policyId: "pol-003",
  },
  {
    id: "alert-2",
    title: "Sottoassicurazione mobilia",
    description: "Somma assicurata inferiore al valore stimato degli effetti personali.",
    severity: "high",
    policyId: "pol-002",
  },
  {
    id: "alert-3",
    title: "Premio salute sopra mediana",
    description: "Al 78° percentile rispetto a profili simili in Ticino.",
    severity: "medium",
    policyId: "pol-004",
  },
  {
    id: "alert-4",
    title: "Protezione giuridica in scadenza",
    description: "Rinnovo automatico previsto tra 45 giorni.",
    severity: "low",
    policyId: "pol-005",
  },
  {
    id: "alert-5",
    title: "Casco auto da rivedere",
    description: "Rapporto premio/valore veicolo sopra la soglia consigliata.",
    severity: "low",
    policyId: "pol-007",
  },
];

export const documents: Document[] = [
  { id: "doc-001", name: "Helsana_Complementare_2025.pdf", type: "Polizza", category: "Salute", uploadedAt: "2025-10-14", status: "completed", policyId: "pol-004", size: "2.4 MB" },
  { id: "doc-002", name: "Helsana_Condizioni_Generali.pdf", type: "CG", category: "Salute", uploadedAt: "2025-10-14", status: "completed", policyId: "pol-004", size: "1.8 MB" },
  { id: "doc-003", name: "AXA_Auto_2025.pdf", type: "Polizza", category: "Auto", uploadedAt: "2025-10-18", status: "completed", policyId: "pol-001", size: "3.1 MB" },
  { id: "doc-004", name: "Zurich_Mobilia_2025.pdf", type: "Polizza", category: "Mobilia", uploadedAt: "2025-11-02", status: "analyzing", policyId: "pol-002", size: "2.7 MB" },
  { id: "doc-005", name: "Mobiliar_RC_Privata.pdf", type: "Polizza", category: "RC", uploadedAt: "2025-11-05", status: "completed", policyId: "pol-003", size: "1.2 MB" },
  { id: "doc-006", name: "Coop_Rechtsschutz_2024.pdf", type: "Polizza", category: "Giuridica", uploadedAt: "2025-11-08", status: "uploaded", policyId: "pol-005", size: "980 KB" },
  { id: "doc-007", name: "SwissLife_Vita_2025.pdf", type: "Polizza", category: "Vita", uploadedAt: "2025-11-10", status: "completed", policyId: "pol-006", size: "4.2 MB" },
  { id: "doc-008", name: "Allianz_Casco_2025.pdf", type: "Polizza", category: "Auto", uploadedAt: "2025-11-12", status: "completed", policyId: "pol-007", size: "2.1 MB" },
  { id: "doc-009", name: "Helvetia_Casa_2025.pdf", type: "Polizza", category: "Mobilia", uploadedAt: "2025-11-14", status: "error", policyId: "pol-008", size: "1.5 MB" },
];

export const analysisItems: AnalysisItem[] = [
  {
    id: "an-1",
    type: "duplicate",
    title: "RC privata + RC mobilia",
    description:
      "Entrambe le polizze includono copertura verso terzi. Verifica se la polizza mobilia esclude la RC già coperta altrove.",
    severity: "medium",
    policies: ["pol-003", "pol-002"],
    priority: 2,
  },
  {
    id: "an-2",
    type: "under",
    title: "Somma assicurata mobilia insufficiente",
    description:
      "Stima attuale CHF 95'000 vs. somma assicurata CHF 80'000. Rischio di penalità proporzionale in caso di sinistro.",
    severity: "high",
    policies: ["pol-002"],
    priority: 1,
  },
  {
    id: "an-3",
    type: "over",
    title: "Casco parziale su veicolo deprezzato",
    description:
      "Il valore attuale del veicolo (CHF 18'000) rende il premio casco meno efficiente rispetto a RC sola.",
    severity: "low",
    policies: ["pol-007"],
    priority: 4,
  },
  {
    id: "an-4",
    type: "missing",
    title: "Nessuna copertura viaggio",
    description:
      "Non risulta una polizza viaggio o assistenza annuale. Consigliata per viaggi fuori UE.",
    severity: "medium",
    priority: 3,
  },
  {
    id: "an-5",
    type: "over",
    title: "Premio salute complementare elevato",
    description:
      "Al 78° percentile del mercato per età e canton. Possibile ottimizzazione modello/franchigia.",
    severity: "medium",
    policies: ["pol-004"],
    priority: 2,
  },
];

export const benchmarks: Benchmark[] = [
  {
    id: "bm-1",
    category: "health",
    label: "Salute complementare",
    userPremium: 3840,
    marketMedian: 3280,
    marketRange: [2900, 4100],
    percentile: 78,
  },
  {
    id: "bm-2",
    category: "car",
    label: "Auto RC + casco",
    userPremium: 2180,
    marketMedian: 2050,
    marketRange: [1650, 2800],
    percentile: 58,
  },
  {
    id: "bm-3",
    category: "household",
    label: "Mobilia domestica",
    userPremium: 890,
    marketMedian: 720,
    marketRange: [550, 1100],
    percentile: 82,
  },
  {
    id: "bm-4",
    category: "liability",
    label: "RC privata",
    userPremium: 320,
    marketMedian: 280,
    marketRange: [220, 380],
    percentile: 65,
  },
  {
    id: "bm-5",
    category: "legal",
    label: "Protezione giuridica",
    userPremium: 480,
    marketMedian: 410,
    marketRange: [350, 550],
    percentile: 71,
  },
];

export const recommendations: Recommendation[] = [
  {
    id: "rec-1",
    title: "Aumenta somma assicurata mobilia",
    description:
      "Allinea la copertura al valore reale degli effetti personali per evitare sottoassicurazione.",
    priority: "high",
    estimatedImpact: "Protezione completa in caso di sinistro",
    difficulty: "easy",
    nextStep: "Aggiorna inventario e contatta l'assicuratore",
    category: "household",
  },
  {
    id: "rec-2",
    title: "Verifica sovrapposizione RC",
    description:
      "Analizza le clausole di esclusione tra RC privata e RC nella polizza mobilia.",
    priority: "high",
    estimatedImpact: "CHF 320 / anno potenziale risparmio",
    difficulty: "moderate",
    nextStep: "Confronta le condizioni generali delle due polizze",
    category: "liability",
  },
  {
    id: "rec-3",
    title: "Valuta modello assicurazione malattie",
    description:
      "Un modello con medico di famiglia potrebbe ridurre il premio mantenendo copertura adeguata.",
    priority: "medium",
    estimatedImpact: "CHF 420–580 / anno",
    difficulty: "easy",
    nextStep: "Simula i modelli disponibili per il 2026",
    category: "health",
  },
  {
    id: "rec-4",
    title: "Confronta protezione giuridica prima del rinnovo",
    description:
      "Il premio attuale è sopra la mediana di mercato per profili simili.",
    priority: "medium",
    estimatedImpact: "CHF 40–60 / anno",
    difficulty: "moderate",
    nextStep: "Richiedi preventivi comparativi entro 30 giorni",
    category: "legal",
  },
  {
    id: "rec-5",
    title: "Valuta polizza viaggio annuale",
    description:
      "Copertura mancante per viaggi internazionali e assistenza medica all'estero.",
    priority: "low",
    estimatedImpact: "CHF 80–150 / anno",
    difficulty: "easy",
    nextStep: "Confronta offerte viaggio multi-trip",
    category: "travel",
  },
  {
    id: "rec-6",
    title: "Rivedi casco parziale auto",
    description:
      "Con veicolo oltre 6 anni, RC sola potrebbe essere più efficiente.",
    priority: "low",
    estimatedImpact: "CHF 380–520 / anno",
    difficulty: "moderate",
    nextStep: "Calcola rapporto premio/valore veicolo",
    category: "car",
  },
];

export const categoryLabels: Record<string, string> = {
  health: "Salute",
  car: "Auto",
  household: "Mobilia",
  liability: "RC",
  legal: "Protezione giuridica",
  life: "Vita",
  travel: "Viaggio",
};

export const statusLabels: Record<string, string> = {
  active: "Attiva",
  expiring: "In scadenza",
  review: "Da rivedere",
};

export function getPolicyById(id: string): Policy | undefined {
  return policies.find((p) => p.id === id);
}

export function getDocumentsByPolicyId(policyId: string): Document[] {
  return documents.filter((d) => d.policyId === policyId);
}
