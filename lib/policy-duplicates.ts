import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { PolicyInput, UserPolicy } from "@/lib/types";
import { logPolicyAnalysisInfo } from "@/lib/policy-analysis-logging";

const policySelectForMatch =
  "id, user_id, document_id, provider, policy_type, policy_number, premium_amount, premium_frequency, requires_review, source, created_at";

type PolicyMatchRow = {
  id: string;
  user_id: string;
  document_id: string | null;
  provider: string;
  policy_type: string;
  policy_number: string | null;
  premium_amount: number | string | null;
  premium_frequency: string | null;
  requires_review: boolean | null;
  source: string | null;
  created_at: string;
};

export type PolicyDuplicateMatchKind =
  | "document_id"
  | "provider_policy_number"
  | "provider_type_premium";

export type PolicyDuplicateMatch = {
  kind: PolicyDuplicateMatchKind;
  policyId: string;
  confident: boolean;
};

function normalizeProvider(value: string) {
  return value.trim().toLowerCase();
}

function normalizePolicyNumber(value: string | null | undefined) {
  if (!value?.trim()) {
    return null;
  }

  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function toNullableNumber(value: number | string | null) {
  if (value === null) {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function premiumsAreSimilar(
  left: number | null,
  right: number | null,
  toleranceRatio = 0.05
) {
  if (left === null || right === null || left <= 0 || right <= 0) {
    return false;
  }

  const delta = Math.abs(left - right);
  const baseline = Math.max(left, right);

  return delta / baseline <= toleranceRatio;
}

export async function findPolicyByDocumentId(
  userId: string,
  documentId: string
): Promise<UserPolicy | null> {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("policies")
    .select(policySelectForMatch)
    .eq("user_id", userId)
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return { id: data.id } as UserPolicy;
}

export async function findPolicyDuplicateMatch(
  userId: string,
  draft: Pick<
    PolicyInput,
    "documentId" | "provider" | "policyType" | "policyNumber" | "premiumAmount"
  >
): Promise<PolicyDuplicateMatch | null> {
  if (draft.documentId) {
    const byDocument = await findPolicyByDocumentId(userId, draft.documentId);
    if (byDocument) {
      return {
        kind: "document_id",
        policyId: byDocument.id,
        confident: true,
      };
    }
  }

  const policyNumber = normalizePolicyNumber(draft.policyNumber);
  const provider = normalizeProvider(draft.provider);

  if (!provider || !policyNumber) {
    return findUncertainPremiumMatch(userId, draft);
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("policies")
    .select(policySelectForMatch)
    .eq("user_id", userId)
    .ilike("provider", draft.provider.trim())
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    return findUncertainPremiumMatch(userId, draft);
  }

  const match = (data as PolicyMatchRow[]).find(
    (row) => normalizePolicyNumber(row.policy_number) === policyNumber
  );

  if (match) {
    return {
      kind: "provider_policy_number",
      policyId: match.id,
      confident: true,
    };
  }

  return findUncertainPremiumMatch(userId, draft);
}

async function findUncertainPremiumMatch(
  userId: string,
  draft: Pick<PolicyInput, "provider" | "policyType" | "premiumAmount">
): Promise<PolicyDuplicateMatch | null> {
  const provider = draft.provider?.trim();
  if (!provider || draft.premiumAmount === null) {
    return null;
  }

  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("policies")
    .select(policySelectForMatch)
    .eq("user_id", userId)
    .eq("policy_type", draft.policyType)
    .ilike("provider", provider)
    .order("created_at", { ascending: false });

  if (error || !data?.length) {
    return null;
  }

  const targetPremium = draft.premiumAmount;
  const match = (data as PolicyMatchRow[]).find((row) =>
    premiumsAreSimilar(toNullableNumber(row.premium_amount), targetPremium)
  );

  if (!match) {
    return null;
  }

  return {
    kind: "provider_type_premium",
    policyId: match.id,
    confident: false,
  };
}

export async function resolvePolicyForDocumentAnalysis(
  userId: string,
  documentId: string,
  draft: PolicyInput
): Promise<{ policyId: string; reused: boolean; match: PolicyDuplicateMatch | null }> {
  const match = await findPolicyDuplicateMatch(userId, {
    ...draft,
    documentId,
  });

  if (match?.confident) {
    logPolicyAnalysisInfo("duplicate_policy_detected", {
      documentId,
      policyId: match.policyId,
      matchKind: match.kind,
    });
    logPolicyAnalysisInfo("existing_policy_reused", {
      documentId,
      policyId: match.policyId,
      matchKind: match.kind,
    });

    return { policyId: match.policyId, reused: true, match };
  }

  return { policyId: "", reused: false, match };
}
