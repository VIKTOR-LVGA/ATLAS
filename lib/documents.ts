import "server-only";

import { createHash, randomUUID } from "node:crypto";
import { cache } from "react";
import type { DocumentStatus, UserDocument } from "@/lib/types";
import { DataFetchError } from "@/lib/data-fetch";
import {
  getInternalFailureReason,
  logPolicyAnalysisError,
  logPolicyAnalysisInfo,
} from "@/lib/policy-analysis-logging";
import {
  getProcessingStaleBeforeIso,
  isDocumentProcessingStale,
} from "@/lib/document-analysis-state";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export { ANALYSIS_PROCESSING_STALE_MINUTES, isDocumentProcessingStale } from "@/lib/document-analysis-state";

const documentSelect =
  "id, file_name, file_path, file_size, mime_type, status, analysis_error, file_hash, created_at, updated_at";

const POLICY_DOCUMENTS_BUCKET = "policy-documents";
const MAX_POLICY_DOCUMENT_SIZE = 10 * 1024 * 1024;
const PDF_SIGNATURE = "%PDF-";
const SIGNED_DOCUMENT_URL_TTL_SECONDS = 60;

export class DocumentUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentUploadError";
  }
}

export class DuplicateDocumentUploadError extends DocumentUploadError {
  readonly existingDocumentId: string;

  constructor(existingDocumentId: string) {
    super("Questo documento sembra già presente nel tuo archivio.");
    this.name = "DuplicateDocumentUploadError";
    this.existingDocumentId = existingDocumentId;
  }
}

export class DocumentManagementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentManagementError";
  }
}

const documentStatuses = [
  "uploaded",
  "processing",
  "analyzed",
  "failed",
] as const;

function toDocumentStatus(status: string): DocumentStatus {
  if (documentStatuses.includes(status as DocumentStatus)) {
    return status as DocumentStatus;
  }

  switch (status) {
    case "analyzing":
      return "processing";
    case "completed":
      return "analyzed";
    default:
      return status === "error" ? "failed" : "uploaded";
  }
}

function toUserDocument(document: {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number | string | null;
  mime_type: string | null;
  status: string;
  analysis_error?: string | null;
  created_at: string;
  updated_at: string;
}): UserDocument {
  return {
    id: document.id,
    fileName: document.file_name,
    filePath: document.file_path,
    fileSize:
      document.file_size === null ? null : Number.parseInt(String(document.file_size), 10),
    mimeType: document.mime_type,
    status: toDocumentStatus(document.status),
    analysisError: document.analysis_error ?? null,
    createdAt: document.created_at,
    updatedAt: document.updated_at,
  };
}

function getDisplayFileName(file: File) {
  const compactName = file.name.replace(/\s+/g, " ").trim();

  return compactName.slice(0, 180) || "polizza.pdf";
}

function getStorageFileName(fileName: string) {
  const stem = fileName.replace(/\.pdf$/i, "");
  const safeStem = stem
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[-\s]+/g, "-")
    .slice(0, 80)
    .toLowerCase();

  return `${randomUUID()}-${safeStem || "polizza"}.pdf`;
}

async function readPdfBytes(file: File) {
  if (file.size === 0) {
    throw new DocumentUploadError("Seleziona un PDF da caricare.");
  }

  if (file.size > MAX_POLICY_DOCUMENT_SIZE) {
    throw new DocumentUploadError("Il PDF supera il limite di 10 MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const signature = buffer.subarray(0, PDF_SIGNATURE.length).toString("utf8");

  if (signature !== PDF_SIGNATURE) {
    throw new DocumentUploadError("Atlas accetta solo file PDF validi.");
  }

  return buffer;
}

function computePdfSha256(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

async function findCurrentUserDocumentByHash(userId: string, fileHash: string) {
  const supabase = await getSupabaseServerClient();
  const { data, error } = await supabase
    .from("documents")
    .select(documentSelect)
    .eq("user_id", userId)
    .eq("file_hash", fileHash)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return toUserDocument(data);
}

export const getCurrentUserDocuments = cache(async (): Promise<UserDocument[]> => {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return [];
  }

  const { data, error } = await supabase
    .from("documents")
    .select(documentSelect)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    throw new DataFetchError("documents.list", error);
  }

  if (!data) {
    return [];
  }

  return data.map(toUserDocument);
});

export const getCurrentUserDocumentById = cache(
  async (id: string): Promise<UserDocument | null> => {
    const supabase = await getSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

    const { data, error } = await supabase
      .from("documents")
      .select(documentSelect)
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) {
      throw new DataFetchError("documents.byId", error);
    }

    if (!data) {
      return null;
    }

    return toUserDocument(data);
  }
);

export async function uploadUserDocument(file: File): Promise<UserDocument> {
  const pdfBuffer = await readPdfBytes(file);
  const fileHash = computePdfSha256(pdfBuffer);

  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new DocumentUploadError("Accedi di nuovo per caricare il documento.");
  }

  const existingDocument = await findCurrentUserDocumentByHash(user.id, fileHash);

  if (existingDocument) {
    logPolicyAnalysisInfo("duplicate_document_detected", {
      existingDocumentId: existingDocument.id,
      fileHashPrefix: fileHash.slice(0, 8),
    });
    throw new DuplicateDocumentUploadError(existingDocument.id);
  }

  const fileName = getDisplayFileName(file);
  const filePath = `${user.id}/${getStorageFileName(fileName)}`;
  const { error: storageError } = await supabase.storage
    .from(POLICY_DOCUMENTS_BUCKET)
    .upload(filePath, pdfBuffer, {
      cacheControl: "3600",
      contentType: "application/pdf",
      upsert: false,
    });

  if (storageError) {
    throw new DocumentUploadError(
      "Caricamento non riuscito. Riprova tra poco o contatta il supporto se il problema persiste."
    );
  }

  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      file_name: fileName,
      file_path: filePath,
      file_size: file.size,
      mime_type: "application/pdf",
      file_hash: fileHash,
    })
    .select(documentSelect)
    .single();

  if (insertError || !document) {
    await supabase.storage.from(POLICY_DOCUMENTS_BUCKET).remove([filePath]);
    throw new DocumentUploadError(
      "Il file e stato ricevuto, ma il registro documenti non e stato aggiornato."
    );
  }

  return toUserDocument(document);
}

export async function createSignedDocumentUrl(document: UserDocument) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !document.filePath.startsWith(`${user.id}/`)) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(POLICY_DOCUMENTS_BUCKET)
    .createSignedUrl(document.filePath, SIGNED_DOCUMENT_URL_TTL_SECONDS, {
      download: document.fileName,
    });

  if (error || !data) {
    return null;
  }

  return data.signedUrl;
}

export async function downloadCurrentUserDocumentFile(document: UserDocument) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !document.filePath.startsWith(`${user.id}/`)) {
    throw new DocumentManagementError("Documento non disponibile per l'analisi.");
  }

  const { data, error } = await supabase.storage
    .from(POLICY_DOCUMENTS_BUCKET)
    .download(document.filePath);

  if (error || !data) {
    throw new DocumentManagementError("PDF non scaricabile da Storage.");
  }

  return Buffer.from(await data.arrayBuffer());
}

export async function updateCurrentUserDocumentStatus(
  id: string,
  status: DocumentStatus
) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new DocumentManagementError("Accedi di nuovo per aggiornare il documento.");
  }

  const { data, error } = await supabase
    .from("documents")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(documentSelect)
    .maybeSingle();

  if (error) {
    throw new DocumentManagementError("Stato documento non aggiornato.");
  }

  return data ? toUserDocument(data) : null;
}

export async function claimCurrentUserDocumentForAnalysis(
  id: string
): Promise<UserDocument> {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new DocumentManagementError("Accedi di nuovo per aggiornare il documento.");
  }

  const { data: current, error: readError } = await supabase
    .from("documents")
    .select(documentSelect)
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (readError || !current) {
    throw new DocumentManagementError("Documento non trovato.");
  }

  const status = toDocumentStatus(current.status);
  const stale = isDocumentProcessingStale(current.updated_at);

  if (status === "processing" && !stale) {
    logPolicyAnalysisInfo("analysis_already_processing", { documentId: id });
    throw new DocumentManagementError("Analisi già in corso per questo documento.");
  }

  if (status !== "uploaded" && status !== "failed" && !(status === "processing" && stale)) {
    throw new DocumentManagementError("Documento non disponibile per l'analisi.");
  }

  if (status === "processing" && stale) {
    logPolicyAnalysisInfo("analysis_processing_stale_recovered", {
      documentId: id,
    });
  }

  const staleBefore = getProcessingStaleBeforeIso();
  let updateQuery = supabase
    .from("documents")
    .update({ status: "processing" })
    .eq("id", id)
    .eq("user_id", user.id);

  if (status === "processing") {
    updateQuery = updateQuery
      .eq("status", "processing")
      .lt("updated_at", staleBefore);
  } else {
    updateQuery = updateQuery.in("status", ["uploaded", "failed"]);
  }

  const { data, error } = await updateQuery.select(documentSelect).maybeSingle();

  if (error || !data) {
    logPolicyAnalysisInfo("analysis_already_processing", { documentId: id });
    throw new DocumentManagementError("Analisi già in corso per questo documento.");
  }

  return toUserDocument(data);
}

export async function resetCurrentUserDocumentForReanalysis(id: string) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new DocumentManagementError("Accedi di nuovo per aggiornare il documento.");
  }

  const { data, error } = await supabase
    .from("documents")
    .update({
      status: "uploaded",
      analysis_error: null,
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "analyzed")
    .select(documentSelect)
    .maybeSingle();

  if (error || !data) {
    throw new DocumentManagementError(
      "Impossibile preparare il documento per una nuova analisi."
    );
  }

  return toUserDocument(data);
}

export async function markCurrentUserDocumentAnalysisFailed(
  id: string,
  analysisError: string
) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new DocumentManagementError("Accedi di nuovo per aggiornare il documento.");
  }

  const { data, error } = await supabase
    .from("documents")
    .update({
      status: "failed",
      analysis_error: getInternalFailureReason(analysisError),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select(documentSelect)
    .maybeSingle();

  if (!error) {
    return data ? toUserDocument(data) : null;
  }

  logPolicyAnalysisError("document_analysis_error_store_failed", {
    documentId: id,
    error: error.message,
  });

  return updateCurrentUserDocumentStatus(id, "failed");
}

export async function clearCurrentUserDocumentAnalysisError(id: string) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { error } = await supabase
    .from("documents")
    .update({ analysis_error: null })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    logPolicyAnalysisError("document_analysis_error_clear_failed", {
      documentId: id,
      error: error.message,
    });
  }
}

export async function setCurrentUserDocumentAnalysisError(
  id: string,
  analysisError: string
) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { error } = await supabase
    .from("documents")
    .update({ analysis_error: getInternalFailureReason(analysisError) })
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    logPolicyAnalysisError("document_analysis_error_store_failed", {
      documentId: id,
      error: error.message,
    });
  }
}

export async function deleteCurrentUserDocument(id: string) {
  const supabase = await getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new DocumentManagementError("Accedi di nuovo per eliminare il documento.");
  }

  const { data: document, error: documentError } = await supabase
    .from("documents")
    .select("id, file_path")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (documentError || !document) {
    return false;
  }

  const { error: storageError } = await supabase.storage
    .from(POLICY_DOCUMENTS_BUCKET)
    .remove([document.file_path]);

  if (storageError) {
    throw new DocumentManagementError("Il PDF non e stato eliminato da Storage.");
  }

  const { error: deleteError } = await supabase
    .from("documents")
    .delete()
    .eq("id", document.id)
    .eq("user_id", user.id);

  if (deleteError) {
    throw new DocumentManagementError("Il registro documenti non e stato aggiornato.");
  }

  return true;
}
