import "server-only";

const LOG_PREFIX = "[atlas:policy-analysis]";
const MAX_INTERNAL_REASON_LENGTH = 1200;

const BLOCKED_LOG_KEYS = new Set([
  "textpreview",
  "filename",
  "extractedtext",
  "provider",
  "personname",
  "policynumber",
  "rawresponse",
  "reason",
  "errorbody",
]);

type LogValue = string | number | boolean | null | undefined;
type LogDetails = Record<string, LogValue>;

function cleanLogString(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function cleanLogDetails(details: LogDetails) {
  return Object.fromEntries(
    Object.entries(details).filter(([key]) => {
      const normalized = key.toLowerCase();
      return !BLOCKED_LOG_KEYS.has(normalized);
    })
  );
}

/** For DB storage only — never log the return value. */
export function getTextPreview(value: string) {
  return cleanLogString(value, 500);
}

export function getInternalFailureReason(value: string) {
  return cleanLogString(value, MAX_INTERNAL_REASON_LENGTH);
}

export function logPolicyAnalysisInfo(event: string, details: LogDetails = {}) {
  console.info(LOG_PREFIX, event, cleanLogDetails(details));
}

export function logPolicyAnalysisError(event: string, details: LogDetails = {}) {
  console.error(LOG_PREFIX, event, cleanLogDetails(details));
}
