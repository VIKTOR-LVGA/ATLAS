import "server-only";

const DEFAULT_MAX_INPUT_CHARS = 32_000;
const HEAD_RESERVE_CHARS = 14_000;
const TAIL_RESERVE_CHARS = 4_000;
const MAX_PRIORITY_LINES = 120;

const INSURANCE_TERM_PATTERN =
  /\b(premio|premi|franchigia|scoperto|assicurat|polizz|copertur|complement|complementar|lamal|kvg|lca|vvg|telmed|hmo|rinnov|valid|helsana|axa|zurich|allianz|css|swica|sanitas|assurance|versicher|kranken|maladie|deductible|franchise|contratto|n\.?\s*d.?assicurato|versichertennummer)\b/i;

const PAGE_NUMBER_PATTERN = /^\s*(pagina|page|seite)\s+\d+\s*(di|of|\/)\s*\d+\s*$/i;

export type CompactedExtractionText = {
  text: string;
  originalTextLength: number;
  compactedTextLength: number;
  reductionPercent: number;
  wasTruncated: boolean;
};

function normalizeWhitespace(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function collapseRepeatedLines(text: string) {
  const lines = text.split("\n");
  const collapsed: string[] = [];
  let previousNormalized: string | null = null;
  let repeatCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      if (collapsed.at(-1) !== "") {
        collapsed.push("");
      }
      previousNormalized = null;
      repeatCount = 0;
      continue;
    }

    const normalized = trimmed.toLowerCase();

    if (normalized === previousNormalized) {
      repeatCount += 1;
      if (repeatCount >= 2) {
        continue;
      }
    } else {
      previousNormalized = normalized;
      repeatCount = 0;
    }

    if (PAGE_NUMBER_PATTERN.test(trimmed) && collapsed.length > 8) {
      continue;
    }

    collapsed.push(trimmed);
  }

  return collapsed.join("\n");
}

function scoreLine(line: string, index: number, totalLines: number) {
  let score = 0;

  if (INSURANCE_TERM_PATTERN.test(line)) {
    score += 12;
  }

  if (/\d/.test(line)) {
    score += 2;
  }

  if (/\b(chf|eur|%)\b/i.test(line)) {
    score += 3;
  }

  const relativePosition = index / Math.max(totalLines - 1, 1);
  if (relativePosition < 0.2) {
    score += 4;
  } else if (relativePosition > 0.8) {
    score += 2;
  }

  return score;
}

function capTextWithPriority(text: string, maxChars: number) {
  if (text.length <= maxChars) {
    return { text, wasTruncated: false };
  }

  const lines = text.split("\n");
  const head = text.slice(0, HEAD_RESERVE_CHARS);
  const tail = text.slice(-TAIL_RESERVE_CHARS);
  const middleLines = lines.slice(
    Math.floor(lines.length * 0.12),
    Math.ceil(lines.length * 0.88)
  );

  const ranked = middleLines
    .map((line, index) => ({
      line,
      index,
      score: scoreLine(line, index, middleLines.length),
    }))
    .filter((entry) => entry.line.trim() && entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, MAX_PRIORITY_LINES)
    .sort((left, right) => left.index - right.index);

  const priorityBlock = ranked.map((entry) => entry.line).join("\n");

  let combined = `${head}\n\n---\n\n${priorityBlock}\n\n---\n\n${tail}`;

  if (combined.length > maxChars) {
    combined = combined.slice(0, maxChars);
  }

  return {
    text: combined.trim(),
    wasTruncated: true,
  };
}

function getMaxInputChars() {
  const configured = Number(process.env.OPENAI_POLICY_EXTRACTION_MAX_INPUT_CHARS);

  if (Number.isFinite(configured) && configured >= 8_000) {
    return Math.round(configured);
  }

  return DEFAULT_MAX_INPUT_CHARS;
}

export function compactExtractionText(rawText: string): CompactedExtractionText {
  const originalTextLength = rawText.length;
  const normalized = collapseRepeatedLines(normalizeWhitespace(rawText));
  const maxChars = getMaxInputChars();

  if (normalized.length <= maxChars) {
    return {
      text: normalized,
      originalTextLength,
      compactedTextLength: normalized.length,
      reductionPercent:
        originalTextLength > 0
          ? Math.round(
              ((originalTextLength - normalized.length) / originalTextLength) * 100
            )
          : 0,
      wasTruncated: false,
    };
  }

  const capped = capTextWithPriority(normalized, maxChars);
  const compactedTextLength = capped.text.length;
  const reductionPercent =
    originalTextLength > 0
      ? Math.round(
          ((originalTextLength - compactedTextLength) / originalTextLength) * 100
        )
      : 0;

  return {
    text: capped.text,
    originalTextLength,
    compactedTextLength,
    reductionPercent: Math.max(0, reductionPercent),
    wasTruncated: capped.wasTruncated,
  };
}
