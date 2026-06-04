import "server-only";

const LOG_PREFIX = "[atlas:analysis:timing]";

export type AnalysisTimingReport = {
  documentId: string;
  totalMs?: number;
  pdfMs?: number;
  openaiMs?: number;
  normalizeMs?: number;
  extractMs?: number;
  dbMs?: number;
  handoffMs?: number;
  usedFallback?: boolean;
  fallbackUsed?: boolean;
  useFastFirst?: boolean;
  modelUsed?: string;
  confidence?: number | null;
  originalTextLength?: number;
  compactedTextLength?: number;
  reductionPercent?: number;
  outcome?: "success" | "error";
};

function formatTimingValue(value: number | boolean | undefined) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.round(value));
  }

  return undefined;
}

export function logAnalysisTiming(report: AnalysisTimingReport) {
  const segments = [
    LOG_PREFIX,
    `documentId=${report.documentId}`,
    report.outcome ? `outcome=${report.outcome}` : null,
    formatTimingValue(report.totalMs) !== undefined
      ? `totalMs=${formatTimingValue(report.totalMs)}`
      : null,
    formatTimingValue(report.pdfMs) !== undefined
      ? `pdfMs=${formatTimingValue(report.pdfMs)}`
      : null,
    formatTimingValue(report.openaiMs) !== undefined
      ? `openaiMs=${formatTimingValue(report.openaiMs)}`
      : null,
    formatTimingValue(report.normalizeMs) !== undefined
      ? `normalizeMs=${formatTimingValue(report.normalizeMs)}`
      : null,
    formatTimingValue(report.extractMs) !== undefined
      ? `extractMs=${formatTimingValue(report.extractMs)}`
      : null,
    formatTimingValue(report.dbMs) !== undefined
      ? `dbMs=${formatTimingValue(report.dbMs)}`
      : null,
    formatTimingValue(report.handoffMs) !== undefined
      ? `handoffMs=${formatTimingValue(report.handoffMs)}`
      : null,
    report.usedFallback !== undefined
      ? `usedFallback=${formatTimingValue(report.usedFallback)}`
      : null,
    report.fallbackUsed !== undefined
      ? `fallbackUsed=${formatTimingValue(report.fallbackUsed)}`
      : null,
    report.modelUsed ? `modelUsed=${report.modelUsed}` : null,
    report.useFastFirst !== undefined
      ? `useFastFirst=${formatTimingValue(report.useFastFirst)}`
      : null,
    report.confidence !== undefined && report.confidence !== null
      ? `confidence=${formatTimingValue(report.confidence)}`
      : null,
    formatTimingValue(report.originalTextLength) !== undefined
      ? `originalTextLength=${formatTimingValue(report.originalTextLength)}`
      : null,
    formatTimingValue(report.compactedTextLength) !== undefined
      ? `compactedTextLength=${formatTimingValue(report.compactedTextLength)}`
      : null,
    formatTimingValue(report.reductionPercent) !== undefined
      ? `reductionPercent=${formatTimingValue(report.reductionPercent)}`
      : null,
  ].filter((segment): segment is string => Boolean(segment));

  console.info(segments.join(" "));
}

export function elapsedMs(startedAt: number) {
  return Math.max(0, Math.round(performance.now() - startedAt));
}
