"use client";

import { useActionState } from "react";
import { UserPlus } from "lucide-react";
import {
  assignCoverageToInsuredPersonAction,
  type AssignCoverageActionState,
} from "@/app/(app)/policies/actions";
import { formatCoverageDisplayLabel } from "@/lib/coverage-display-labels";
import { getCoverageNetPremium } from "@/lib/policy-health-grouping";
import type { PolicyCoverageDetail } from "@/lib/types";
import { formatCHF } from "@/lib/utils";

export type UnassignedCoverageAssignItem = {
  stableKey: string;
  coverage: PolicyCoverageDetail;
  suggestedPersonKey: string | null;
  suggestedPersonName: string | null;
};

export type InsuredPersonAssignOption = {
  stableKey: string;
  label: string;
};

const initialState: AssignCoverageActionState = {
  status: "idle",
  message: "",
};

function formatCoverageLabel(coverage: PolicyCoverageDetail) {
  const label = formatCoverageDisplayLabel(coverage);
  const net = getCoverageNetPremium(coverage);
  const premium =
    net !== null && net !== undefined ? formatCHF(net) : "—";

  return `${label} · ${premium}`;
}

function AssignCoverageRow({
  policyId,
  item,
  people,
}: {
  policyId: string;
  item: UnassignedCoverageAssignItem;
  people: InsuredPersonAssignOption[];
}) {
  const [state, formAction, pending] = useActionState(
    assignCoverageToInsuredPersonAction.bind(null, policyId),
    initialState
  );

  const defaultPersonKey =
    item.suggestedPersonKey &&
    people.some((person) => person.stableKey === item.suggestedPersonKey)
      ? item.suggestedPersonKey
      : "";

  return (
    <li className="rounded-xl border atlas-alert-warning p-3">
      <p className="text-[12px] font-medium leading-snug text-foreground">
        {formatCoverageLabel(item.coverage)}
      </p>
      {item.suggestedPersonName ? (
        <p className="mt-1 text-[11px] text-accent">
          Suggerito:{" "}
          <span className="font-medium">{item.suggestedPersonName}</span>
        </p>
      ) : null}
      <form action={formAction} className="mt-3 space-y-2">
        <input type="hidden" name="coverage_stable_key" value={item.stableKey} />
        <label className="block">
          <span className="text-[11px] font-medium text-muted">Persona</span>
          <select
            name="insured_person_key"
            required
            defaultValue={defaultPersonKey}
            disabled={pending || people.length === 0}
            className="mt-0.5 w-full rounded-lg border border-border bg-card px-3 py-2 text-[12px] text-foreground shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:opacity-60"
          >
            <option value="" disabled>
              Scegli persona
            </option>
            {people.map((person) => (
              <option key={person.stableKey} value={person.stableKey}>
                {person.label}
                {person.stableKey === item.suggestedPersonKey ? " (suggerito)" : ""}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={pending || people.length === 0}
          className="inline-flex w-full items-center justify-center gap-2 atlas-btn-primary px-3 py-2 text-[12px] disabled:cursor-wait disabled:opacity-60"
        >
          <UserPlus className="h-3.5 w-3.5" />
          {pending ? "Assegnazione..." : "Assegna"}
        </button>
        {state.status === "error" ? (
          <p aria-live="polite" className="text-[11px] text-red-600">
            {state.message}
          </p>
        ) : null}
      </form>
    </li>
  );
}

export function PolicyUnassignedCoverageAssign({
  policyId,
  items,
  people,
}: {
  policyId: string;
  items: UnassignedCoverageAssignItem[];
  people: InsuredPersonAssignOption[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <AssignCoverageRow
          key={item.stableKey}
          policyId={policyId}
          item={item}
          people={people}
        />
      ))}
    </ul>
  );
}
