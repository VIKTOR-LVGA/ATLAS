import "server-only";

export { UNREADABLE_PDF_USER_MESSAGE } from "@/lib/extraction-messages";

export function isDevMockExtractionEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.ENABLE_DEV_MOCK_EXTRACTION === "true"
  );
}
