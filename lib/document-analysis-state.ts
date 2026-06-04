export const ANALYSIS_PROCESSING_STALE_MINUTES = 20;

export function isDocumentProcessingStale(updatedAt: string, now = Date.now()) {
  const updated = new Date(updatedAt).getTime();

  if (!Number.isFinite(updated)) {
    return false;
  }

  return now - updated > ANALYSIS_PROCESSING_STALE_MINUTES * 60 * 1000;
}

export function getProcessingStaleBeforeIso(now = Date.now()) {
  return new Date(
    now - ANALYSIS_PROCESSING_STALE_MINUTES * 60 * 1000
  ).toISOString();
}
