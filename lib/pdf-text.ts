import "server-only";

import PDFParser, {
  type Output as Pdf2JsonOutput,
  type Text as Pdf2JsonText,
} from "pdf2json";
import {
  getTextPreview,
  logPolicyAnalysisInfo,
} from "@/lib/policy-analysis-logging";

const PDF_SIGNATURE = "%PDF-";
const MIN_USEFUL_TEXT_LENGTH = 240;
const MIN_USEFUL_TOKEN_COUNT = 20;
const MIN_READABLE_CHARACTER_RATIO = 0.78;
const MAX_SUSPICIOUS_CHARACTER_RATIO = 0.06;
const MAX_REPEATED_SUSPICIOUS_RUN = 4;
const MAX_EXTRACTED_TEXT_LENGTH = 18000;
const PDF2JSON_LINE_Y_TOLERANCE = 0.35;
const suspiciousCharacters = new Set([
  "\u0000",
  "\u00a2",
  "\u00a4",
  "\u00fe",
  "\u00ff",
  "\ufffd",
  "\ufffe",
  "\uffff",
  "\u25a0",
  "\u25a1",
  "\u25a3",
  "\u25a8",
]);

type PdfTextQuality = {
  textLength: number;
  usefulTokenCount: number;
  readableCharacterRatio: number;
  suspiciousCharacterRatio: number;
  longestSuspiciousRun: number;
  hasBinaryMarkers: boolean;
  hasUnreadablePattern: boolean;
};

type PositionedPdfText = {
  x: number;
  y: number;
  w: number;
  text: string;
};

type Pdf2JsonExtractionResult = {
  rawTextContent: string;
  structuredTextContent: string;
};

export class PdfTextExtractionError extends Error {
  readonly textLength: number | null;
  readonly textPreview: string | null;
  readonly quality: PdfTextQuality | null;

  constructor(
    message: string,
    options: {
      quality?: PdfTextQuality;
      textLength?: number;
      textPreview?: string;
    } = {}
  ) {
    super(message);
    this.name = "PdfTextExtractionError";
    this.quality = options.quality ?? null;
    this.textLength = options.textLength ?? options.quality?.textLength ?? null;
    this.textPreview = options.textPreview ?? null;
  }
}

function isSuspiciousCharacter(character: string) {
  return suspiciousCharacters.has(character.toLowerCase());
}

function isReadableCharacter(character: string) {
  return /[\p{L}\p{N}\p{P}\p{Sc}]/u.test(character);
}

function normalizeExtractedText(value: string) {
  return value
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/-{8,}\s*Page\s+\(\d+\)\s+Break\s*-{8,}/gi, "\n\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200d\ufeff]/g, "")
    .replace(/([\p{L}])-\n([\p{L}])/gu, "$1$2")
    .replace(/[\t\f\v]+/g, " ")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, " ")
    .split("\n")
    .map((line) => line.replace(/[^\S\n]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, MAX_EXTRACTED_TEXT_LENGTH);
}

function getUsefulTokenCount(text: string) {
  const tokens = text.match(/[\p{L}\p{N}][\p{L}\p{N}'’./:-]{1,}/gu) ?? [];

  return tokens.filter(
    (token) => ![...token].some((character) => isSuspiciousCharacter(character))
  ).length;
}

function getLongestSuspiciousRun(text: string) {
  let currentCharacter = "";
  let currentRun = 0;
  let longestRun = 0;

  for (const character of text) {
    if (!isSuspiciousCharacter(character)) {
      currentCharacter = "";
      currentRun = 0;
      continue;
    }

    if (character === currentCharacter) {
      currentRun += 1;
    } else {
      currentCharacter = character;
      currentRun = 1;
    }

    longestRun = Math.max(longestRun, currentRun);
  }

  return longestRun;
}

function getTextQuality(text: string): PdfTextQuality {
  let readableCharacters = 0;
  let suspiciousCharactersCount = 0;
  let meaningfulCharacters = 0;

  for (const character of text) {
    if (/\s/u.test(character)) {
      continue;
    }

    meaningfulCharacters += 1;

    if (isSuspiciousCharacter(character)) {
      suspiciousCharactersCount += 1;
      continue;
    }

    if (isReadableCharacter(character)) {
      readableCharacters += 1;
    } else {
      suspiciousCharactersCount += 1;
    }
  }

  return {
    textLength: text.length,
    usefulTokenCount: getUsefulTokenCount(text),
    readableCharacterRatio:
      meaningfulCharacters === 0 ? 0 : readableCharacters / meaningfulCharacters,
    suspiciousCharacterRatio:
      meaningfulCharacters === 0
        ? 0
        : suspiciousCharactersCount / meaningfulCharacters,
    longestSuspiciousRun: getLongestSuspiciousRun(text),
    hasBinaryMarkers: /%PDF-\d|\bobj\b|\bendobj\b|\bstream\b|\bendstream\b/.test(
      text
    ),
    hasUnreadablePattern: /(?:[\u00a2\u00a4\u00fe\u00ff\ufffd]\s*){4,}/iu.test(
      text
    ),
  };
}

function getPoorQualityReason(quality: PdfTextQuality) {
  if (quality.textLength < MIN_USEFUL_TEXT_LENGTH) {
    return `Il PDF contiene troppo poco testo leggibile (${quality.textLength} caratteri).`;
  }

  if (quality.usefulTokenCount < MIN_USEFUL_TOKEN_COUNT) {
    return `Il PDF contiene pochi token utili (${quality.usefulTokenCount}).`;
  }

  if (quality.readableCharacterRatio < MIN_READABLE_CHARACTER_RATIO) {
    return `Qualita testo PDF insufficiente: readable ratio ${quality.readableCharacterRatio.toFixed(2)}.`;
  }

  if (quality.suspiciousCharacterRatio > MAX_SUSPICIOUS_CHARACTER_RATIO) {
    return `Qualita testo PDF insufficiente: troppi caratteri sospetti (${quality.suspiciousCharacterRatio.toFixed(2)}).`;
  }

  if (quality.longestSuspiciousRun >= MAX_REPEATED_SUSPICIOUS_RUN) {
    return `Qualita testo PDF insufficiente: sequenza ripetuta di caratteri non leggibili (${quality.longestSuspiciousRun}).`;
  }

  if (quality.hasUnreadablePattern) {
    return "Qualita testo PDF insufficiente: pattern di caratteri non leggibili rilevato.";
  }

  if (quality.hasBinaryMarkers) {
    return "Qualita testo PDF insufficiente: il testo estratto contiene marker binari del PDF.";
  }

  return null;
}

function decodePdf2JsonText(value: string) {
  if (!value.includes("%")) {
    return value;
  }

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function getPdf2JsonTextValue(text: Pdf2JsonText) {
  return text.R.map((run) => decodePdf2JsonText(run.T)).join("").trim();
}

function shouldInsertSpace(
  currentLine: string,
  nextText: string,
  gapFromPrevious: number
) {
  if (!currentLine) {
    return false;
  }

  if (/^[,.;:%!?)]/u.test(nextText)) {
    return false;
  }

  if (/[(\[/]$/u.test(currentLine)) {
    return false;
  }

  return gapFromPrevious > 0.08;
}

function joinLineText(items: PositionedPdfText[]) {
  return items
    .sort((a, b) => a.x - b.x)
    .reduce(
      (line, item, index, sortedItems) => {
        const previousItem = sortedItems[index - 1];
        const gapFromPrevious = previousItem
          ? item.x - (previousItem.x + previousItem.w)
          : 0;
        const prefix = shouldInsertSpace(line, item.text, gapFromPrevious)
          ? " "
          : "";

        return `${line}${prefix}${item.text}`;
      },
      ""
    )
    .trim();
}

function getStructuredTextFromPdf2Json(data: Pdf2JsonOutput) {
  return data.Pages.map((page) => {
    const textItems = page.Texts.map((text) => ({
      x: text.x,
      y: text.y,
      w: text.w,
      text: getPdf2JsonTextValue(text),
    })).filter((text) => text.text.length > 0);
    const lines: PositionedPdfText[][] = [];

    for (const textItem of textItems.sort((a, b) => a.y - b.y || a.x - b.x)) {
      const currentLine = lines.at(-1);

      if (
        currentLine &&
        Math.abs(currentLine[0].y - textItem.y) <= PDF2JSON_LINE_Y_TOLERANCE
      ) {
        currentLine.push(textItem);
        continue;
      }

      lines.push([textItem]);
    }

    return lines.map(joinLineText).filter(Boolean).join("\n");
  })
    .filter(Boolean)
    .join("\n\n");
}

function getPdf2JsonErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "parserError" in error &&
    error.parserError instanceof Error
  ) {
    return error.parserError.message;
  }

  return String(error);
}

function choosePdf2JsonText(result: Pdf2JsonExtractionResult) {
  if (
    result.structuredTextContent.length >
    result.rawTextContent.length * 1.2
  ) {
    return result.structuredTextContent;
  }

  return result.rawTextContent || result.structuredTextContent;
}

async function extractTextWithPdf2Json(
  pdf: Buffer
): Promise<Pdf2JsonExtractionResult> {
  const parser = new PDFParser(null, true);

  return new Promise((resolve, reject) => {
    let isSettled = false;

    const settle = (callback: () => void) => {
      if (isSettled) {
        return;
      }

      isSettled = true;
      callback();
      parser.destroy();
    };

    parser.once("pdfParser_dataError", (error) => {
      settle(() => reject(new Error(getPdf2JsonErrorMessage(error))));
    });

    parser.once("pdfParser_dataReady", (data) => {
      const rawTextContent = parser.getRawTextContent();
      const structuredTextContent = getStructuredTextFromPdf2Json(data);

      settle(() =>
        resolve({
          rawTextContent,
          structuredTextContent,
        })
      );
    });

    try {
      parser.parseBuffer(Buffer.from(pdf));
    } catch (error) {
      settle(() => reject(error instanceof Error ? error : new Error(String(error))));
    }
  });
}

export async function extractReadableTextFromPdf(pdf: Buffer) {
  const header = pdf.subarray(0, PDF_SIGNATURE.length).toString("latin1");

  if (header !== PDF_SIGNATURE) {
    logPolicyAnalysisInfo("pdf_text_invalid_signature", {
      pdfBytes: pdf.length,
      textLength: 0,
      textPreview: "",
    });

    throw new PdfTextExtractionError("Il file non sembra un PDF valido.", {
      textLength: 0,
      textPreview: "",
    });
  }

  let rawText = "";

  try {
    rawText = choosePdf2JsonText(await extractTextWithPdf2Json(pdf));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown PDF parser error";

    logPolicyAnalysisInfo("pdf_text_parser_failed", {
      pdfBytes: pdf.length,
      textLength: 0,
      textPreview: "",
      parser: "pdf2json",
      error: message,
    });

    throw new PdfTextExtractionError(
      `Il testo del PDF non e estraibile senza OCR: ${message}`,
      {
        textLength: 0,
        textPreview: "",
      }
    );
  }

  const text = normalizeExtractedText(rawText);
  const quality = getTextQuality(text);
  const textPreview = getTextPreview(text);

  logPolicyAnalysisInfo("pdf_text_extracted", {
    pdfBytes: pdf.length,
    textLength: text.length,
    readableCharacterRatio: Number(quality.readableCharacterRatio.toFixed(3)),
    suspiciousCharacterRatio: Number(
      quality.suspiciousCharacterRatio.toFixed(3)
    ),
    usefulTokenCount: quality.usefulTokenCount,
    longestSuspiciousRun: quality.longestSuspiciousRun,
    hasBinaryMarkers: quality.hasBinaryMarkers,
    hasUnreadablePattern: quality.hasUnreadablePattern,
    parser: "pdf2json",
  });

  const poorQualityReason = getPoorQualityReason(quality);

  if (poorQualityReason) {
    logPolicyAnalysisInfo("pdf_text_quality_rejected", {
      minUsefulTextLength: MIN_USEFUL_TEXT_LENGTH,
      minUsefulTokenCount: MIN_USEFUL_TOKEN_COUNT,
      minReadableCharacterRatio: MIN_READABLE_CHARACTER_RATIO,
      maxSuspiciousCharacterRatio: MAX_SUSPICIOUS_CHARACTER_RATIO,
      textLength: text.length,
      readableCharacterRatio: Number(quality.readableCharacterRatio.toFixed(3)),
      suspiciousCharacterRatio: Number(
        quality.suspiciousCharacterRatio.toFixed(3)
      ),
      usefulTokenCount: quality.usefulTokenCount,
      longestSuspiciousRun: quality.longestSuspiciousRun,
    });

    throw new PdfTextExtractionError(poorQualityReason, {
      quality,
      textPreview,
    });
  }

  return text;
}
