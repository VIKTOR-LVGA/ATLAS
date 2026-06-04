"use client";

import Link from "next/link";
import { useActionState, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  LoaderCircle,
  Sparkles,
  Upload,
} from "lucide-react";
import {
  uploadDocumentAction,
  type UploadDocumentActionState,
} from "@/app/(app)/documents/actions";
import { cn } from "@/lib/utils";

const MAX_FILE_SIZE_LABEL = "10 MB";

const initialState: UploadDocumentActionState = {
  status: "idle",
  message: "",
};

type UploadVisualState =
  | "idle"
  | "dragging"
  | "selected"
  | "uploading"
  | "success"
  | "error";

export function DocumentUploadForm() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [dismissedSuccess, setDismissedSuccess] = useState(false);
  const [state, formAction, pending] = useActionState(
    uploadDocumentAction,
    initialState
  );

  const showSuccessPanel = state.status === "success" && !dismissedSuccess;
  const successDocumentId = state.documentId ?? null;

  const hasFile = selectedFileName.length > 0;
  const visualState: UploadVisualState = showSuccessPanel
    ? "success"
    : pending
      ? "uploading"
      : state.status === "error"
        ? "error"
        : dragging
          ? "dragging"
          : hasFile
            ? "selected"
            : "idle";

  const formDisabled = pending || showSuccessPanel;

  function assignFile(file: File | undefined) {
    if (!file) {
      setSelectedFileName("");
      return;
    }
    setSelectedFileName(file.name);
    setDismissedSuccess(false);
  }

  function handleReset() {
    setDismissedSuccess(true);
    setSelectedFileName("");
    setDragging(false);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <form
      action={formAction}
      className="atlas-stack-tight min-w-0"
      aria-busy={pending}
    >
      <input
        ref={inputRef}
        id="policy-document-file"
        name="file"
        type="file"
        accept=".pdf,application/pdf"
        required={!showSuccessPanel}
        disabled={formDisabled}
        className="sr-only"
        onChange={(event) => {
          assignFile(event.currentTarget.files?.[0]);
        }}
      />

      {showSuccessPanel ? (
        <div
          className="atlas-upload-zone atlas-upload-zone--success rounded-2xl border px-4 py-8 text-center sm:py-9"
          data-state="success"
          role="status"
          aria-live="polite"
        >
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--success-bg)] text-[var(--success-text)] ring-1 ring-[var(--success-border)]">
            <CheckCircle2 className="h-7 w-7" strokeWidth={2} />
          </span>
          <p className="mt-4 text-[15px] font-semibold text-foreground">
            Documento ricevuto
          </p>
          <p className="mt-1.5 text-[12px] leading-relaxed text-muted">
            {state.message ||
              "Il PDF è nel tuo archivio privato. Avvia l’analisi AI per creare la bozza polizza."}
          </p>
          <div className="mt-5 flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center">
            {successDocumentId ? (
              <>
                <Link
                  href={`/documents/${successDocumentId}`}
                  className="atlas-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2.5 text-[13px]"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  Apri documento
                </Link>
                <Link
                  href={`/documents/${successDocumentId}`}
                  className="atlas-btn-secondary inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2.5 text-[13px]"
                >
                  <Sparkles className="h-4 w-4 shrink-0" />
                  Analizza documento
                </Link>
              </>
            ) : (
              <Link
                href="/documents"
                className="atlas-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 px-4 py-2.5 text-[13px]"
              >
                Vai ai documenti
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="mt-4 text-[12px] font-medium text-accent hover:underline"
          >
            Carica un altro PDF
          </button>
        </div>
      ) : (
        <>
          <div
            data-state={visualState}
            className={cn(
              "atlas-upload-zone relative flex min-w-0 flex-col items-center rounded-2xl border-2 border-dashed px-4 py-9 text-center transition-[border-color,background,box-shadow,transform] sm:py-11",
              visualState === "dragging" &&
                "border-accent bg-accent-soft shadow-sm ring-4 ring-accent/15",
              visualState === "selected" &&
                "border-accent/50 bg-accent-soft/40 ring-2 ring-accent/10",
              visualState === "uploading" &&
                "border-accent/40 bg-card-muted pointer-events-none",
              visualState === "error" &&
                "border-[var(--warning-border)] bg-[var(--warning-bg)]",
              visualState === "idle" && "border-border bg-card-muted/60"
            )}
            onDragEnter={(event) => {
              event.preventDefault();
              if (!pending) {
                setDragging(true);
              }
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (
                event.currentTarget === event.target ||
                !event.currentTarget.contains(event.relatedTarget as Node)
              ) {
                setDragging(false);
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              if (!pending) {
                setDragging(true);
              }
            }}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              if (pending || !inputRef.current) {
                return;
              }
              const file = event.dataTransfer.files?.[0];
              if (file) {
                const dataTransfer = new DataTransfer();
                dataTransfer.items.add(file);
                inputRef.current.files = dataTransfer.files;
                assignFile(file);
              }
            }}
          >
            <span
              className={cn(
                "flex h-14 w-14 items-center justify-center rounded-2xl ring-1 transition-colors",
                visualState === "uploading"
                  ? "bg-accent-soft text-accent ring-accent/20"
                  : "bg-card text-accent ring-border shadow-sm"
              )}
            >
              {visualState === "uploading" ? (
                <LoaderCircle className="h-7 w-7 animate-spin" aria-hidden />
              ) : (
                <Upload className="h-7 w-7" aria-hidden />
              )}
            </span>

            <p className="mt-4 text-[15px] font-semibold tracking-tight text-foreground">
              {visualState === "dragging"
                ? "Rilascia il PDF qui"
                : "Carica una polizza PDF"}
            </p>
            <p className="mt-1.5 w-full max-w-full px-1 text-[12px] leading-relaxed text-muted sm:max-w-xs">
              Atlas preparerà il documento per l&apos;analisi AI.
            </p>
            <p className="mt-2 w-full max-w-full px-1 text-[11px] leading-snug text-muted-foreground">
              Dopo il caricamento potrai avviare l&apos;analisi e creare una bozza
              polizza.
            </p>

            <p className="mt-4 inline-flex flex-wrap items-center justify-center gap-2 text-[10px] font-medium uppercase tracking-wide text-muted">
              <span className="rounded-full border border-border-subtle bg-card px-2 py-0.5">
                PDF
              </span>
              <span className="text-border">·</span>
              <span>Max {MAX_FILE_SIZE_LABEL}</span>
            </p>

            {hasFile && visualState !== "uploading" ? (
              <div className="mt-4 flex max-w-full items-center gap-2 rounded-lg border border-border-subtle bg-card px-3 py-2">
                <FileText className="h-4 w-4 shrink-0 text-accent" />
                <span className="min-w-0 truncate text-[12px] font-medium text-foreground">
                  {selectedFileName}
                </span>
              </div>
            ) : null}

            {visualState !== "uploading" ? (
              <label
                htmlFor="policy-document-file"
                className={cn(
                  "atlas-btn-secondary mt-4 min-h-[44px] cursor-pointer px-5 py-2.5 text-[13px] sm:mt-5",
                  pending && "pointer-events-none opacity-60"
                )}
              >
                {hasFile ? "Scegli un altro file" : "Seleziona PDF"}
              </label>
            ) : null}

            {visualState === "uploading" ? (
              <div className="mt-5 w-full max-w-[14rem] space-y-2">
                <p className="text-[12px] font-medium text-foreground">
                  Caricamento in corso…
                </p>
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-accent-soft"
                  role="progressbar"
                  aria-label="Caricamento in corso"
                  aria-valuetext="Caricamento in corso"
                >
                  <span className="atlas-upload-progress block h-full w-1/3 rounded-full bg-accent" />
                </div>
                <p className="text-[11px] leading-snug text-muted">
                  Stiamo archiviando il PDF in modo sicuro nel tuo workspace.
                </p>
              </div>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={pending || !hasFile}
            className="atlas-btn-primary min-h-[44px] w-full px-4 py-2.5 text-[13px] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? (
              <span className="inline-flex items-center justify-center gap-2">
                <LoaderCircle className="h-4 w-4 animate-spin" />
                Caricamento in corso…
              </span>
            ) : (
              <span className="inline-flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4" />
                Carica e prepara per l&apos;analisi
              </span>
            )}
          </button>
        </>
      )}

      {state.status === "error" && !showSuccessPanel ? (
        <div
          role="alert"
          aria-live="polite"
          className="atlas-message-enter atlas-alert-warning flex gap-2.5 px-3.5 py-3"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-foreground">
              {state.documentId ? "Documento già presente" : "Caricamento non riuscito"}
            </p>
            <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
              {state.message}
            </p>
            {state.documentId ? (
              <Link
                href={`/documents/${state.documentId}`}
                className="mt-2 inline-flex min-h-[44px] items-center text-[11px] font-semibold text-accent"
              >
                Apri documento esistente
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </form>
  );
}
