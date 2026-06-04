"use client";

import { useActionState, type MouseEvent } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  LoaderCircle,
  RotateCcw,
  WandSparkles,
} from "lucide-react";
import {
  analyzeDocumentAction,
  type AnalyzeDocumentActionState,
} from "@/app/(app)/documents/actions";
import { DocumentAnalysisPendingTimeline } from "@/components/documents/DocumentAnalysisPendingTimeline";
import { isDocumentProcessingStale } from "@/lib/document-analysis-state";
import type { DocumentStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const initialState: AnalyzeDocumentActionState = {
  status: "idle",
  message: "",
};

const RECREATE_CONFIRM_MESSAGE =
  "Vuoi ricreare una bozza da questo PDF? Atlas eseguirà una nuova estrazione AI. La polizza precedente non verrà eliminata automaticamente.";

type DocumentAnalysisFormVariant = "button" | "icon" | "menu";

interface DocumentAnalysisFormProps {
  documentId: string;
  documentStatus: DocumentStatus;
  updatedAt: string;
  linkedPolicyId?: string | null;
  variant?: DocumentAnalysisFormVariant;
}

function AnalysisProcessingOverlay({ compact }: { compact: boolean }) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-background/75 p-4 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Analisi documento in corso"
    >
      <div className="atlas-surface-card max-h-[min(85vh,calc(100dvh-2rem))] w-full max-w-md overflow-y-auto rounded-2xl border border-border p-4 shadow-xl sm:p-5">
        <DocumentAnalysisPendingTimeline compact={compact} />
      </div>
    </div>
  );
}

export function DocumentAnalysisForm({
  documentId,
  documentStatus,
  updatedAt,
  linkedPolicyId = null,
  variant = "button",
}: DocumentAnalysisFormProps) {
  const [state, formAction, pending] = useActionState(
    analyzeDocumentAction.bind(null, documentId),
    initialState
  );

  const processingStale = isDocumentProcessingStale(updatedAt);
  const isProcessing =
    documentStatus === "processing" && !processingStale;
  const isStaleProcessing =
    documentStatus === "processing" && processingStale;
  const busy = pending || isProcessing;
  const hasLinkedPolicy = Boolean(linkedPolicyId);
  const showOpenPolicy = documentStatus === "analyzed" && hasLinkedPolicy;
  const showRecreate =
    documentStatus === "analyzed" && !hasLinkedPolicy;
  const showAnalyze =
    documentStatus === "uploaded" ||
    documentStatus === "failed" ||
    isStaleProcessing;
  const showInlineTimeline = busy && variant === "button";
  const showOverlayTimeline = busy && variant !== "button";

  const primaryLabel = isProcessing
    ? "Analisi in corso…"
    : isStaleProcessing
      ? "Riprendi analisi"
      : documentStatus === "failed"
        ? "Riprova analisi"
        : showRecreate
          ? "Ricrea bozza"
          : showOpenPolicy
            ? "Apri polizza"
            : "Analizza documento";

  if (showOpenPolicy && linkedPolicyId) {
    const linkClass =
      variant === "icon"
        ? "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-accent-soft text-accent shadow-sm hover:-translate-y-px hover:border-accent/40"
        : variant === "menu"
          ? "inline-flex min-h-[44px] w-full items-center justify-start gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium text-accent hover:bg-accent-soft"
          : "atlas-btn-primary inline-flex min-h-[44px] w-full items-center justify-center gap-2 px-4 py-2.5 text-[13px]";

    return (
      <Link href={`/policies/${linkedPolicyId}`} className={linkClass} title="Apri polizza">
        {variant === "icon" ? (
          <>
            <ExternalLink className="h-4 w-4" />
            <span className="sr-only">Apri polizza</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Apri polizza
          </>
        )}
      </Link>
    );
  }

  function handleRecreateClick(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(RECREATE_CONFIRM_MESSAGE)) {
      event.preventDefault();
    }
  }

  return (
    <>
      <form
        action={formAction}
        className={cn(variant === "icon" ? "inline-flex" : "min-w-0 space-y-3")}
        onClick={(event) => event.stopPropagation()}
        aria-busy={busy}
      >
        {showRecreate ? (
          <input type="hidden" name="recreate" value="1" />
        ) : null}

        <button
          type="submit"
          disabled={!showAnalyze && !showRecreate}
          title={primaryLabel}
          aria-label={variant === "icon" ? primaryLabel : undefined}
          onClick={showRecreate ? handleRecreateClick : undefined}
          className={cn(
            "inline-flex items-center justify-center gap-1.5 font-medium transition disabled:cursor-not-allowed disabled:opacity-65",
            variant === "button" &&
              "atlas-btn-primary min-h-[44px] w-full px-4 py-2.5 text-[13px] shadow-sm",
            variant === "icon" &&
              "h-8 w-8 rounded-lg border border-border bg-accent-soft text-accent shadow-sm hover:-translate-y-px hover:border-accent/40 hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
            variant === "menu" &&
              "min-h-[44px] w-full justify-start rounded-lg px-2.5 py-2 text-[12px] text-accent hover:bg-accent-soft",
            isProcessing && "cursor-not-allowed opacity-65"
          )}
        >
          {busy ? (
            <LoaderCircle
              className={cn(variant === "icon" ? "h-4 w-4" : "h-3.5 w-3.5", "animate-spin")}
            />
          ) : showRecreate ? (
            <RotateCcw className={variant === "icon" ? "h-4 w-4" : "h-3.5 w-3.5"} />
          ) : (
            <WandSparkles className={variant === "icon" ? "h-4 w-4" : "h-3.5 w-3.5"} />
          )}
          {variant === "icon" ? (
            <span className="sr-only">{primaryLabel}</span>
          ) : (
            primaryLabel
          )}
        </button>

        {showInlineTimeline ? (
          <div className="atlas-surface-card rounded-xl border border-border-subtle p-4">
            <DocumentAnalysisPendingTimeline />
          </div>
        ) : null}

        {isStaleProcessing && !pending && variant !== "icon" ? (
          <p className="text-[11px] leading-relaxed text-muted">
            L&apos;analisi precedente si è interrotta. Puoi riprovare in sicurezza.
          </p>
        ) : null}

        {!busy &&
          variant !== "icon" &&
          documentStatus === "failed" &&
          state.status !== "error" && (
            <p className="text-[11px] leading-relaxed text-muted">
              Ultima analisi non riuscita. Riprova o crea la polizza manualmente.
            </p>
          )}

        {showRecreate && variant !== "icon" && !pending ? (
          <p className="text-[11px] leading-relaxed text-muted">
            Analisi completata senza polizza collegata. La ricreazione richiede conferma.
          </p>
        ) : null}

        {state.status === "error" && (
          <div
            role="alert"
            aria-live="polite"
            className="atlas-message-enter atlas-alert-warning flex gap-2.5 px-3.5 py-3"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-foreground">
                Analisi non riuscita
              </p>
              <p className="mt-0.5 text-[11px] leading-relaxed text-muted">
                {state.message}
              </p>
            </div>
          </div>
        )}
      </form>

      {showOverlayTimeline ? (
        <AnalysisProcessingOverlay compact={variant === "menu"} />
      ) : null}
    </>
  );
}
