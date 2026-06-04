import { SWISS_INSURANCE_KNOWLEDGE_RULES } from "@/lib/insurance-knowledge/ch";
import type {
  SwissInsuranceKnowledgeHintInput,
  SwissInsuranceKnowledgeHintsResult,
  SwissKnowledgeRule,
} from "@/lib/insurance-knowledge/types";
import {
  getInferredSectionsFromText,
  getSwissInsuranceKeywords,
  normalizeSwissInsuranceProvider,
  normalizeSwissPolicyClassification,
} from "@/lib/swiss-insurance-normalization";
import type { SwissPolicySubtype } from "@/lib/swiss-insurance-normalization";

const DEFAULT_MAX_HINTS = 6;
const MAX_RULES_PER_CATEGORY = 2;

function normalizeSignal(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function signalIncludes(signals: string[], needle: string) {
  const token = normalizeSignal(needle);
  if (!token) {
    return false;
  }

  return signals.some(
    (signal) => signal.includes(token) || token.includes(signal)
  );
}

function scoreRule(
  rule: SwissKnowledgeRule,
  input: SwissInsuranceKnowledgeHintInput,
  signals: string[]
): number {
  const when = rule.appliesWhen;
  let score = 0;

  if (when.policyTypes?.length && !when.policyTypes.includes(input.policyTypeGuess)) {
    return 0;
  }

  if (
    when.subtypes?.length &&
    input.subtypeGuess &&
    !when.subtypes.includes(input.subtypeGuess)
  ) {
    return 0;
  }

  if (when.policyTypes?.includes(input.policyTypeGuess)) {
    score += 3;
  }

  if (input.subtypeGuess && when.subtypes?.includes(input.subtypeGuess)) {
    score += 4;
  }

  if (when.providers?.length && input.provider) {
    const providerNorm = normalizeSignal(input.provider);
    const providerHit = when.providers.some(
      (name) => providerNorm.includes(normalizeSignal(name))
    );

    if (providerHit) {
      score += 1;
    }
  }

  for (const keyword of when.keywords ?? []) {
    if (signalIncludes(signals, keyword)) {
      score += 2;
    }
  }

  for (const section of when.sections ?? []) {
    if (signalIncludes(signals, section)) {
      score += 2;
    }
  }

  if (rule.policyType === input.policyTypeGuess) {
    score += 1;
  }

  if (
    input.subtypeGuess &&
    rule.subtypes?.includes(input.subtypeGuess as SwissPolicySubtype)
  ) {
    score += 2;
  }

  return score;
}

function formatHintLine(rule: SwissKnowledgeRule) {
  return `- [${rule.id}] ${rule.extractionHint}`;
}

export function getSwissInsuranceKnowledgeHints(
  input: SwissInsuranceKnowledgeHintInput
): SwissInsuranceKnowledgeHintsResult {
  const maxHints = input.maxHints ?? DEFAULT_MAX_HINTS;
  const signals = [
    ...input.extractedTextSignals.map(normalizeSignal),
  ].filter(Boolean);

  const ranked = SWISS_INSURANCE_KNOWLEDGE_RULES.map((rule) => ({
    rule,
    score: scoreRule(rule, input, signals),
  }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.rule.id.localeCompare(b.rule.id);
    });

  const selected: SwissKnowledgeRule[] = [];
  const perCategory = new Map<string, number>();
  const selectedIds = new Set<string>();

  const tryAdd = (rule: SwissKnowledgeRule, enforceCategoryCap: boolean) => {
    if (selected.length >= maxHints || selectedIds.has(rule.id)) {
      return;
    }

    const count = perCategory.get(rule.category) ?? 0;
    if (enforceCategoryCap && count >= MAX_RULES_PER_CATEGORY) {
      return;
    }

    selected.push(rule);
    selectedIds.add(rule.id);
    perCategory.set(rule.category, count + 1);
  };

  for (const { rule } of ranked) {
    if (selected.length >= maxHints) {
      break;
    }

    tryAdd(rule, true);
  }

  for (const { rule } of ranked) {
    if (selected.length >= maxHints) {
      break;
    }

    tryAdd(rule, false);
  }

  return {
    hints: selected.map(formatHintLine),
    ruleIds: selected.map((rule) => rule.id),
  };
}

export function buildExtractionKnowledgeContext(
  fileName: string,
  extractedText: string,
  maxHints = DEFAULT_MAX_HINTS
) {
  const snippet = extractedText.slice(0, 8000);
  const classification = normalizeSwissPolicyClassification(
    undefined,
    `${fileName}\n${snippet}`
  );
  const providerMatch = normalizeSwissInsuranceProvider(
    undefined,
    `${fileName}\n${extractedText.slice(0, 5000)}`
  );
  const keywords = getSwissInsuranceKeywords(extractedText, 30);
  const sections = getInferredSectionsFromText(extractedText);

  const extractedTextSignals = [
    ...classification.matchedKeywords,
    ...keywords,
    ...sections,
    fileName,
  ];

  const result = getSwissInsuranceKnowledgeHints({
    policyTypeGuess: classification.policyType,
    subtypeGuess: classification.subtype === "other" ? null : classification.subtype,
    provider: providerMatch.provider,
    extractedTextSignals,
    maxHints,
  });

  return {
    ...result,
    policyTypeGuess: classification.policyType,
    subtypeGuess: classification.subtype,
  };
}

export function formatSwissInsuranceKnowledgePromptSection(
  hints: string[]
): string {
  if (hints.length === 0) {
    return "";
  }

  return [
    "Swiss insurance context hints (interpretation guidance only — NOT extracted facts):",
    "The PDF text always wins over these hints. Use null when the document does not show a value.",
    "Do not infer legal outcomes, market comparisons, savings, or compliance from hints.",
    ...hints,
    "",
  ].join("\n");
}
