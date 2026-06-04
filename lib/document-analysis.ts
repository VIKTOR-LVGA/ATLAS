import "server-only";

import {
  claimCurrentUserDocumentForAnalysis,
  clearCurrentUserDocumentAnalysisError,
  DocumentManagementError,
  getCurrentUserDocumentById,
  markCurrentUserDocumentAnalysisFailed,
  resetCurrentUserDocumentForReanalysis,
  setCurrentUserDocumentAnalysisError,
  updateCurrentUserDocumentStatus,
} from "@/lib/documents";
import {
  findPolicyByDocumentId,
  resolvePolicyForDocumentAnalysis,
} from "@/lib/policy-duplicates";
import {
  OpenAIPolicyExtractionError,
  openAIPolicyDocumentExtractor,
} from "@/lib/openai-policy-extraction";
import { PdfTextExtractionError } from "@/lib/pdf-text";
import { elapsedMs, logAnalysisTiming } from "@/lib/analysis-timing";
import {
  getInternalFailureReason,
  logPolicyAnalysisError,
  logPolicyAnalysisInfo,
} from "@/lib/policy-analysis-logging";
import {
  createPolicy,
  getCurrentUserPolicyById,
  PolicyManagementError,
} from "@/lib/policies";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type {
  PolicyDetails,
  PolicyInput,
  TypedPolicyType,
  UserDocument,
  UserPolicy,
} from "@/lib/types";

type MockPolicyTemplate = {
  provider: string;
  policyType: TypedPolicyType;
  premiums: number[];
  deductibles: number[];
  coverageAmounts: Array<number | null>;
  keywords: string[];
  getDetails: (seed: number) => PolicyDetails;
};

export type PolicyExtractionDraft = PolicyInput & {
  extractionConfidence: number | null;
  extractionNotes: string | null;
  confidence?: {
    provider: number;
    policyType: number;
    premiumAmount: number;
    deductible: number;
    renewalDate: number;
    details: number;
  };
};

export type PolicyDocumentExtractionResult = {
  draft: PolicyExtractionDraft;
  processingMs: number;
  usedFallback?: boolean;
  fallbackReason?: string;
};

export interface PolicyDocumentExtractor {
  extract(document: UserDocument): Promise<PolicyDocumentExtractionResult>;
}

export class DocumentAnalysisError extends Error {
  readonly internalMessage: string;

  constructor(message: string, options: { internalMessage?: string } = {}) {
    super(message);
    this.name = "DocumentAnalysisError";
    this.internalMessage = getInternalFailureReason(
      options.internalMessage ?? message
    );
  }
}

function pickValue<T>(values: readonly T[], seed: number, offset: number) {
  return values[(seed + offset) % values.length];
}

function getSwissPlate(seed: number) {
  const cantons = ["TI", "ZH", "VD", "GE", "BE"];
  const number = 10000 + (seed % 889999);

  return `${pickValue(cantons, seed, 5)} ${number}`;
}

const mockTemplates: MockPolicyTemplate[] = [
  {
    provider: "Helsana",
    policyType: "health",
    premiums: [94.8, 126.5, 182.4],
    deductibles: [300, 500, 1000],
    coverageAmounts: [null, null, null],
    keywords: ["helsana", "sanita", "salute", "health", "malati", "cassa"],
    getDetails: (seed) => ({
      franchise: pickValue([300, 500, 1000, 2500], seed, 1),
      model: pickValue(["Standard", "Telmed", "HMO"], seed, 3),
      complementary: seed % 2 === 0,
      hospital_coverage: pickValue(
        ["Comune Svizzera", "Semi-privata Svizzera", "Privata mondo"],
        seed,
        7
      ),
    }),
  },
  {
    provider: "AXA",
    policyType: "car",
    premiums: [78.2, 118.6, 164.9],
    deductibles: [500, 1000, 1500],
    coverageAmounts: [20000, 45000, 75000],
    keywords: ["axa", "auto", "casco", "vehicle", "veicolo", "car"],
    getDetails: (seed) => ({
      plate_number: getSwissPlate(seed),
      casco: pickValue(["Totale", "Parziale", "Nessuna"], seed, 2),
      bonus_malus: pickValue(["35%", "45%", "55%"], seed, 4),
      annual_km: pickValue([8000, 12000, 18000], seed, 8),
    }),
  },
  {
    provider: "la Mobiliare",
    policyType: "liability",
    premiums: [17.4, 25.9, 39.8],
    deductibles: [0, 200, 500],
    coverageAmounts: [5000000, 10000000, 20000000],
    keywords: ["rc", "liability", "responsabil", "responsabilita"],
    getDetails: (seed) => ({
      liability_limit: pickValue([5000000, 10000000, 20000000], seed, 2),
      household_members_included: pickValue([1, 2, 4], seed, 6),
    }),
  },
  {
    provider: "la Mobiliare",
    policyType: "household",
    premiums: [24.9, 38.4, 57.7],
    deductibles: [200, 500, 1000],
    coverageAmounts: [60000, 90000, 140000],
    keywords: ["mobilia", "casa", "economia", "domestic", "household", "hausrat"],
    getDetails: (seed) => ({
      insured_sum: pickValue([60000, 90000, 140000], seed, 1),
      glass_coverage: seed % 2 === 0,
      theft_coverage: seed % 3 !== 0,
    }),
  },
  {
    provider: "Zurich",
    policyType: "legal",
    premiums: [19.5, 31.8, 48.3],
    deductibles: [0, 200, 500],
    coverageAmounts: [null, null, null],
    keywords: ["zurich", "legal", "giuridica", "recht", "protection"],
    getDetails: (seed) => ({
      private_legal: true,
      traffic_legal: seed % 2 === 0,
      coverage_region: pickValue(
        ["Svizzera", "Svizzera ed Europa", "Mondo esclusi USA"],
        seed,
        4
      ),
    }),
  },
  {
    provider: "Swiss Life",
    policyType: "other",
    premiums: [142, 215, 318],
    deductibles: [0, 0, 0],
    coverageAmounts: [50000, 100000, 150000],
    keywords: ["vita", "life", "previdenza", "swisslife", "pensione"],
    getDetails: () => ({
      generic_details:
        "Categoria non ancora specializzata: verificare coperture e beneficiari.",
    }),
  },
] as const;

function getStableSeed(value: string) {
  let seed = 0;

  for (const character of value.toLowerCase()) {
    seed = (seed * 31 + character.charCodeAt(0)) % 2147483647;
  }

  return Math.abs(seed);
}

function pickTemplate(fileName: string, seed: number) {
  const normalizedFileName = fileName.toLowerCase();

  return (
    mockTemplates.find((template) =>
      template.keywords.some((keyword) => normalizedFileName.includes(keyword))
    ) ?? mockTemplates[seed % mockTemplates.length]
  );
}

function getMockRenewalDate(seed: number) {
  const renewalDate = new Date();
  renewalDate.setUTCDate(renewalDate.getUTCDate() + 90 + (seed % 240));

  return renewalDate.toISOString().slice(0, 10);
}

function getConfidence(seed: number, floor: number, offset: number) {
  return Math.min(98, floor + ((seed + offset) % 10));
}

function getOverallConfidence(confidence: PolicyExtractionDraft["confidence"]) {
  if (!confidence) {
    return null;
  }

  const values = Object.values(confidence);
  const total = values.reduce((sum, value) => sum + value, 0);

  return Math.round(total / values.length);
}

function getMockCoverageKind(policyType: TypedPolicyType) {
  switch (policyType) {
    case "health":
      return "lamal_base";
    case "car":
      return "car";
    case "liability":
      return "liability";
    case "household":
      return "household";
    case "legal":
      return "legal_protection";
    default:
      return "other";
  }
}

function getMockAdvancedDetails(
  document: UserDocument,
  template: MockPolicyTemplate,
  seed: number
) {
  const baseDetails = template.getDetails(seed);
  const premiumAmount = pickValue(template.premiums, seed, 1);
  const deductible = pickValue(template.deductibles, seed, 3);
  const coverageAmount = pickValue(template.coverageAmounts, seed, 5);
  const confidence = {
    provider: getConfidence(seed, 87, 1),
    policyType: getConfidence(seed, 84, 3),
    premiumAmount: getConfidence(seed, 78, 5),
    deductible: getConfidence(seed, 76, 7),
    renewalDate: getConfidence(seed, 80, 9),
    details: getConfidence(seed, 72, 11),
  };

  return {
    ...baseDetails,
    coverage_kind: getMockCoverageKind(template.policyType),
    insured_people:
      template.policyType === "health"
        ? [
            {
              name: null,
              birth_date: null,
              premium_amount: premiumAmount,
              premium_frequency: "monthly",
              franchise: baseDetails.franchise ?? deductible,
              deductible,
              model: baseDetails.model ?? null,
              accident_covered: seed % 2 === 0,
              confidence: confidence.details,
              uncertain: true,
            },
          ]
        : [],
    coverages: [
      {
        name:
          template.policyType === "health"
            ? "Copertura principale rilevata"
            : "Copertura principale",
        policy_type: template.policyType,
        coverage_type: getMockCoverageKind(template.policyType),
        category_label: null,
        premium_amount: premiumAmount,
        premium_frequency: "monthly",
        deductible,
        franchise: baseDetails.franchise ?? null,
        coverage_amount: coverageAmount,
        insured_person_name: null,
        confidence: confidence.details,
        uncertain: true,
        notes: "Copertura da verificare: non derivata dal contenuto del PDF.",
      },
    ],
    field_confidence: {
      provider: {
        value: template.provider,
        confidence: confidence.provider,
        uncertain: false,
        evidence: document.fileName,
      },
      policy_type: {
        value: template.policyType,
        confidence: confidence.policyType,
        uncertain: false,
        evidence: document.fileName,
      },
      premium_amount: {
        value: premiumAmount,
        confidence: confidence.premiumAmount,
        uncertain: true,
        evidence: "Stima basata sul nome file.",
      },
      deductible: {
        value: deductible,
        confidence: confidence.deductible,
        uncertain: true,
        evidence: "Stima basata sul nome file.",
      },
      renewal_date: {
        value: getMockRenewalDate(seed),
        confidence: confidence.renewalDate,
        uncertain: true,
        evidence: "Data stimata.",
      },
      details: {
        value: "stima",
        confidence: confidence.details,
        uncertain: true,
        evidence: "Valore stimato.",
      },
    },
    extraction_metadata: {
      matched_keywords: template.keywords.filter((keyword) =>
        document.fileName.toLowerCase().includes(keyword)
      ),
      inferred_sections: ["bozza stimata"],
      warnings: [
        "Il PDF non contiene testo leggibile: i valori sono stime da verificare manualmente.",
      ],
      provider_raw: template.provider,
      normalized_provider: template.provider,
    },
  } satisfies PolicyDetails;
}

async function waitForMockExtraction(seed: number) {
  const processingMs = 2000 + (seed % 2001);

  await new Promise((resolve) => setTimeout(resolve, processingMs));

  return processingMs;
}

export const mockPolicyDocumentExtractor: PolicyDocumentExtractor = {
  async extract(document) {
    const seed = getStableSeed(`${document.fileName}:${document.id}`);
    const template = pickTemplate(document.fileName, seed);
    const processingMs = await waitForMockExtraction(seed);
    const details = getMockAdvancedDetails(document, template, seed);
    const premiumAmount = pickValue(template.premiums, seed, 1);
    const deductible = pickValue(template.deductibles, seed, 3);
    const renewalDate = getMockRenewalDate(seed);

    if (document.fileName.toLowerCase().includes("illeggibile")) {
      throw new DocumentAnalysisError(
        "Analisi automatica non riuscita per questo PDF. Riprova o crea la polizza manualmente."
      );
    }

    return {
      processingMs,
      draft: {
        provider: template.provider,
        documentId: null,
        policyType: template.policyType,
        policyCategoryLabel: null,
        policyNumber: null,
        premiumAmount,
        premiumFrequency: "monthly",
        deductible,
        startDate: null,
        endDate: null,
        renewalDate,
        currency: "CHF",
        coverageAmount: pickValue(template.coverageAmounts, seed, 5),
        details,
        notes: null,
        extractionConfidence: null,
        extractionNotes: null,
        confidence: {
          provider: getConfidence(seed, 87, 1),
          policyType: getConfidence(seed, 84, 3),
          premiumAmount: getConfidence(seed, 78, 5),
          deductible: getConfidence(seed, 76, 7),
          renewalDate: getConfidence(seed, 80, 9),
          details: getConfidence(seed, 72, 11),
        },
      },
    };
  },
};

function getExtractionNotes(
  document: UserDocument,
  extraction: PolicyDocumentExtractionResult
) {
  if (extraction.draft.extractionNotes) {
    return extraction.draft.extractionNotes;
  }

  if (extraction.usedFallback) {
    return [
      "Il PDF non contiene testo leggibile o la qualità non è sufficiente per un'estrazione affidabile.",
      `Documento: ${document.fileName}.`,
      "I valori proposti sono stime da confermare o correggere prima dell'uso.",
    ].join("\n");
  }

  return [
    "Bozza generata dall'analisi Atlas del PDF.",
    `Documento sorgente: ${document.fileName}.`,
    "Tipo, dettagli e confidenze richiedono revisione prima di essere considerati affidabili.",
  ].join("\n");
}

function getAnalysisFailureReason(error: unknown) {
  if (error instanceof OpenAIPolicyExtractionError) {
    return error.internalMessage;
  }

  if (error instanceof DocumentAnalysisError) {
    return error.internalMessage;
  }

  if (
    error instanceof DocumentManagementError ||
    error instanceof PolicyManagementError ||
    error instanceof Error
  ) {
    return `${error.name}: ${error.message}`;
  }

  return "Unknown policy analysis error";
}

function toDocumentAnalysisError(error: unknown) {
  const internalMessage = getAnalysisFailureReason(error);

  if (error instanceof DocumentAnalysisError) {
    return error;
  }

  if (error instanceof OpenAIPolicyExtractionError) {
    return new DocumentAnalysisError(error.message, { internalMessage });
  }

  if (
    error instanceof DocumentManagementError ||
    error instanceof PolicyManagementError
  ) {
    return new DocumentAnalysisError(error.message, { internalMessage });
  }

  return new DocumentAnalysisError(
    "Analisi non riuscita. Riprova tra poco o crea la polizza manualmente.",
    { internalMessage }
  );
}

async function extractPolicyWithFallback(document: UserDocument) {
  try {
    return await openAIPolicyDocumentExtractor.extract(document);
  } catch (error) {
    if (error instanceof PdfTextExtractionError) {
      logPolicyAnalysisInfo("mock_extraction_fallback", {
        documentId: document.id,
        fileName: document.fileName,
        reason: error.message,
        extractedTextLength: error.textLength,
        textPreview: error.textPreview,
      });

      const fallbackExtraction = await mockPolicyDocumentExtractor.extract(document);

      return {
        ...fallbackExtraction,
        fallbackReason: error.message,
        usedFallback: true,
      };
    }

    throw error;
  }
}

export type AnalyzeCurrentUserDocumentOptions = {
  allowRecreate?: boolean;
};

export async function analyzeCurrentUserDocument(
  id: string,
  extractor: PolicyDocumentExtractor = { extract: extractPolicyWithFallback },
  options: AnalyzeCurrentUserDocumentOptions = {}
): Promise<UserPolicy> {
  const totalStartedAt = performance.now();

  let document = await getCurrentUserDocumentById(id);

  if (!document) {
    throw new DocumentAnalysisError("Documento non trovato.");
  }

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new DocumentAnalysisError("Accedi di nuovo per analizzare il documento.");
  }

  const linkedPolicy = await findPolicyByDocumentId(user.id, document.id);

  if (document.status === "analyzed" && linkedPolicy) {
    logPolicyAnalysisInfo("existing_policy_reused", {
      documentId: document.id,
      policyId: linkedPolicy.id,
      matchKind: "document_id",
    });

    const policy = await getCurrentUserPolicyById(linkedPolicy.id);
    if (!policy) {
      throw new DocumentAnalysisError("Polizza collegata non trovata.");
    }

    return policy;
  }

  if (document.status === "analyzed" && !linkedPolicy) {
    if (!options.allowRecreate) {
      throw new DocumentAnalysisError(
        "Questo documento è già stato analizzato. Usa «Ricrea bozza» per una nuova estrazione."
      );
    }

    document = await resetCurrentUserDocumentForReanalysis(document.id);
  }

  let processingDocument: UserDocument;

  try {
    processingDocument = await claimCurrentUserDocumentForAnalysis(document.id);
  } catch (error) {
    if (error instanceof DocumentManagementError) {
      throw new DocumentAnalysisError(error.message);
    }

    throw error;
  }

  try {
    await clearCurrentUserDocumentAnalysisError(processingDocument.id);

    const extractStartedAt = performance.now();
    const extraction = await extractor.extract(processingDocument);
    const extractMs = elapsedMs(extractStartedAt);
    const rawConfidence =
      extraction.draft.extractionConfidence ??
      getOverallConfidence(extraction.draft.confidence) ??
      0;
    const extractionConfidence = extraction.usedFallback
      ? Math.min(35, rawConfidence)
      : rawConfidence;

    const policyInput: PolicyInput = {
      documentId: processingDocument.id,
      provider: extraction.draft.provider,
      policyType: extraction.draft.policyType,
      policyCategoryLabel: extraction.draft.policyCategoryLabel,
      policyNumber: extraction.draft.policyNumber,
      premiumAmount: extraction.draft.premiumAmount,
      premiumFrequency: extraction.draft.premiumFrequency,
      deductible: extraction.draft.deductible,
      startDate: extraction.draft.startDate,
      endDate: extraction.draft.endDate,
      renewalDate: extraction.draft.renewalDate,
      currency: extraction.draft.currency,
      coverageAmount: extraction.draft.coverageAmount,
      details: extraction.draft.details,
      notes: extraction.draft.notes,
    };

    const duplicateResolution = await resolvePolicyForDocumentAnalysis(
      user.id,
      processingDocument.id,
      policyInput
    );

    const dbStartedAt = performance.now();
    let policy: UserPolicy;

    if (duplicateResolution.reused) {
      const existing = await getCurrentUserPolicyById(duplicateResolution.policyId);
      if (!existing) {
        throw new DocumentAnalysisError("Polizza esistente non trovata.");
      }
      policy = existing;
    } else {
      let extractionNotes = getExtractionNotes(processingDocument, extraction);

      if (
        duplicateResolution.match &&
        !duplicateResolution.match.confident
      ) {
        extractionNotes = [
          extractionNotes,
          "Possibile duplicato rilevato: verifica se esiste già una polizza simile nel portafoglio.",
        ]
          .filter(Boolean)
          .join("\n\n");
      }

      policy = await createPolicy(policyInput, {
        source: "ai_draft",
        requiresReview: true,
        extractionConfidence,
        extractionNotes,
      });
    }

    await updateCurrentUserDocumentStatus(processingDocument.id, "analyzed");

    if (extraction.usedFallback && extraction.fallbackReason) {
      await setCurrentUserDocumentAnalysisError(
        processingDocument.id,
        extraction.fallbackReason
      );
    } else {
      await clearCurrentUserDocumentAnalysisError(processingDocument.id);
    }
    const dbMs = elapsedMs(dbStartedAt);

    logAnalysisTiming({
      documentId: processingDocument.id,
      totalMs: elapsedMs(totalStartedAt),
      extractMs,
      dbMs,
      usedFallback: extraction.usedFallback ?? false,
      outcome: "success",
    });

    return policy;
  } catch (error) {
    const internalFailureReason = getAnalysisFailureReason(error);

    logPolicyAnalysisError("document_analysis_failed", {
      documentId: processingDocument.id,
      fileName: processingDocument.fileName,
      reason: internalFailureReason,
    });

    logAnalysisTiming({
      documentId: processingDocument.id,
      totalMs: elapsedMs(totalStartedAt),
      outcome: "error",
    });

    await markCurrentUserDocumentAnalysisFailed(
      processingDocument.id,
      internalFailureReason
    ).catch(() => null);

    throw toDocumentAnalysisError(error);
  }
}
