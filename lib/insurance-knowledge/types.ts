import type { SwissPolicySubtype } from "@/lib/swiss-insurance-normalization";
import type { TypedPolicyType } from "@/lib/types";

export type SwissKnowledgeCategory =
  | "health"
  | "accident_income"
  | "liability_household"
  | "vehicle"
  | "legal_travel_personal"
  | "life_pension"
  | "business";

export type SwissKnowledgeSourceType = "official" | "insurer" | "internal_rule";

export type SwissKnowledgeAppliesWhen = {
  keywords?: string[];
  policyTypes?: TypedPolicyType[];
  subtypes?: SwissPolicySubtype[];
  providers?: string[];
  sections?: string[];
};

export type SwissKnowledgeRule = {
  id: string;
  category: SwissKnowledgeCategory;
  policyType: TypedPolicyType;
  subtypes?: SwissPolicySubtype[];
  jurisdiction: "CH";
  sourceType: SwissKnowledgeSourceType;
  sourceName: string;
  sourceUrl?: string;
  lastReviewed: string;
  ruleSummary: string;
  extractionHint: string;
  interpretationHint?: string;
  userExplanation?: string;
  riskIfMisread: string;
  appliesWhen: SwissKnowledgeAppliesWhen;
};

export type SwissInsuranceKnowledgeHintInput = {
  policyTypeGuess: TypedPolicyType;
  subtypeGuess?: SwissPolicySubtype | null;
  provider?: string | null;
  extractedTextSignals: string[];
  maxHints?: number;
};

export type SwissInsuranceKnowledgeHintsResult = {
  hints: string[];
  ruleIds: string[];
};

export const SWISS_KNOWLEDGE_RULE_ID_PATTERN = /^ch-[a-z][a-z0-9-]*$/;

export function isSwissKnowledgeRuleId(value: string) {
  return SWISS_KNOWLEDGE_RULE_ID_PATTERN.test(value);
}
