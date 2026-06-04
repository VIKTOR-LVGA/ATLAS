/**
 * Regression for Swiss insurance knowledge hint selection.
 * Run: npx --yes tsx lib/insurance-knowledge-regression.ts
 */
import assert from "node:assert/strict";
import { getSwissInsuranceKnowledgeHints } from "@/lib/insurance-knowledge/select-hints";

function runCase(
  name: string,
  input: Parameters<typeof getSwissInsuranceKnowledgeHints>[0],
  expectedIds: string[]
) {
  const result = getSwissInsuranceKnowledgeHints(input);
  assert.ok(
    result.ruleIds.length <= 6,
    `${name}: expected at most 6 hints, got ${result.ruleIds.length}`
  );

  for (const id of expectedIds) {
    assert.ok(
      result.ruleIds.includes(id),
      `${name}: missing rule ${id}, got ${result.ruleIds.join(", ")}`
    );
  }

  assert.ok(result.hints.every((line) => line.startsWith("- [ch-")));
  console.info(`ok ${name}: ${result.ruleIds.join(", ")}`);
}

runCase(
  "health-lamal",
  {
    policyTypeGuess: "health",
    subtypeGuess: "lamal_base",
    extractedTextSignals: ["lamal", "franchigia", "Premi e franchigie"],
  },
  ["ch-health-lamal-001", "ch-health-cost-share-001"]
);

runCase(
  "liability-rc",
  {
    policyTypeGuess: "liability",
    subtypeGuess: "liability",
    extractedTextSignals: ["rc privata", "massimale", "responsabilita civile"],
  },
  ["ch-liability-rc-001"]
);

runCase(
  "car-casco",
  {
    policyTypeGuess: "car",
    subtypeGuess: "casco_partial",
    extractedTextSignals: ["casco parziale", "rc auto", "targa", "bonus malus"],
  },
  ["ch-vehicle-casco-001", "ch-vehicle-bonus-001"]
);

runCase(
  "business-cyber",
  {
    policyTypeGuess: "other",
    subtypeGuess: "business",
    extractedTextSignals: ["cyber aziendale", "impresa", "data breach"],
  },
  ["ch-business-cyber-001", "ch-business-rc-001"]
);

const capped = getSwissInsuranceKnowledgeHints({
  policyTypeGuess: "health",
  subtypeGuess: "lamal_base",
  extractedTextSignals: [
    "lamal",
    "lca",
    "complementare",
    "franchigia",
    "gratuito",
    "telmed",
    "ospedale",
    "infortun",
    "bambino",
  ],
  maxHints: 6,
});

assert.equal(capped.ruleIds.length, 6, "health-rich signals should fill up to 6 hints");
console.info("ok health-cap: 6 hints");
console.info("insurance-knowledge-regression: all passed");
