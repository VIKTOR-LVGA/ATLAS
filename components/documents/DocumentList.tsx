"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import type { KeyboardEvent, SyntheticEvent } from "react";
import {
  ArrowRight,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  MoreVertical,
  Sparkles,
} from "lucide-react";
import { DocumentDeleteForm } from "@/components/documents/DocumentDeleteForm";
import { DocumentAnalysisForm } from "@/components/documents/DocumentAnalysisForm";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { DocumentWorkflowStrip } from "@/components/documents/DocumentWorkflowStrip";
import type { DocumentIntelligenceView } from "@/lib/document-intelligence";
import { cn, formatDate, formatFileSize } from "@/lib/utils";

function getDocumentHref(documentId: string) {
  return `/documents/${documentId}`;
}

function getDownloadHref(documentId: string) {
  return `/documents/${documentId}/download`;
}

function stopRowNavigation(event: SyntheticEvent) {
  event.stopPropagation();
}

const indicatorToneClass = {
  success: "border-emerald-500/20 bg-emerald-500/[0.06] text-[var(--success-text)]",
  warning: "border-amber-500/25 bg-amber-500/[0.06] text-[var(--warning-text)]",
  neutral: "border-border-subtle bg-card-muted/60 text-muted-foreground",
  danger: "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]",
} as const;

function DocumentButtonLink({
  documentId,
  fileName,
  kind,
  className,
}: {
  documentId: string;
  fileName: string;
  kind: "detail" | "download";
  className?: string;
}) {
  const sharedClassName = cn(
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted shadow-sm transition hover:-translate-y-px hover:border-border hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
    className
  );

  if (kind === "detail") {
    return (
      <Link
        href={getDocumentHref(documentId)}
        title="Apri dettagli"
        aria-label={`Apri dettagli di ${fileName}`}
        className={sharedClassName}
        onClick={stopRowNavigation}
      >
        <ExternalLink className="h-4 w-4" />
      </Link>
    );
  }

  return (
    <a
      href={getDownloadHref(documentId)}
      title="Scarica PDF"
      aria-label={`Scarica ${fileName}`}
      className={sharedClassName}
      onClick={stopRowNavigation}
    >
      <Download className="h-4 w-4" />
    </a>
  );
}

function MobileActionMenu({ view }: { view: DocumentIntelligenceView }) {
  const { document } = view;

  return (
    <details className="relative">
      <summary
        title="Altre azioni"
        aria-label={`Altre azioni per ${document.fileName}`}
        className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg border border-border bg-card text-muted shadow-sm transition hover:border-border hover:bg-accent-soft hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 [&::-webkit-details-marker]:hidden"
        onClick={stopRowNavigation}
      >
        <MoreVertical className="h-4 w-4" />
      </summary>
      <div
        className="absolute right-0 top-10 z-20 w-44 rounded-xl border border-border bg-card p-1.5 shadow-xl shadow-[var(--shadow-card)]"
        onClick={stopRowNavigation}
      >
        <Link
          href={getDocumentHref(document.id)}
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium text-muted-foreground transition hover:bg-accent-soft hover:text-accent"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Apri dettagli
        </Link>
        <a
          href={getDownloadHref(document.id)}
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-medium text-muted-foreground transition hover:bg-accent-soft hover:text-accent"
        >
          <Download className="h-3.5 w-3.5" />
          Scarica PDF
        </a>
        <DocumentAnalysisForm
          documentId={document.id}
          documentStatus={document.status}
          updatedAt={document.updatedAt}
          linkedPolicyId={view.linkedPolicy?.id ?? null}
          variant="menu"
        />
        <DocumentDeleteForm documentId={document.id} variant="menu" />
      </div>
    </details>
  );
}

function openDocumentFromKeyboard(
  event: KeyboardEvent<HTMLElement>,
  openDocument: () => void
) {
  if (event.target !== event.currentTarget) {
    return;
  }

  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    openDocument();
  }
}

function DocumentNextActionLink({ view }: { view: DocumentIntelligenceView }) {
  const { nextAction } = view;

  if (nextAction.kind === "wait" || !nextAction.href) {
    return (
      <span className="text-[11px] font-medium text-muted">{nextAction.label}</span>
    );
  }

  return (
    <Link
      href={nextAction.href}
      onClick={stopRowNavigation}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition",
        nextAction.priority === "primary"
          ? "bg-accent-soft text-accent hover:bg-accent/15"
          : "border border-border-subtle text-muted-foreground hover:bg-card-muted"
      )}
    >
      {nextAction.label}
      <ArrowRight className="h-3 w-3" />
    </Link>
  );
}

function DocumentIntelligenceIndicators({ view }: { view: DocumentIntelligenceView }) {
  const visible = view.indicators.slice(0, 4);

  if (visible.length === 0) {
    return null;
  }

  return (
    <ul className="mt-2 flex flex-wrap gap-1">
      {visible.map((indicator) => (
        <li
          key={indicator.id}
          className={cn(
            "rounded-full border px-2 py-0.5 text-[9px] font-medium sm:text-[10px]",
            indicatorToneClass[indicator.tone]
          )}
        >
          {indicator.label}
        </li>
      ))}
    </ul>
  );
}

export function DocumentList({ views }: { views: DocumentIntelligenceView[] }) {
  const router = useRouter();

  return (
    <>
      <div className="atlas-table-scroll hidden lg:block">
        <table className="w-full min-w-[760px] text-[12px]">
          <thead>
            <tr className="border-b border-border-subtle text-[10px] uppercase text-muted">
              <th className="px-5 py-2 text-left">Documento</th>
              <th className="px-3 py-2 text-left">Indicatori</th>
              <th className="px-3 py-2 text-left">Workflow</th>
              <th className="px-3 py-2 text-left">Prossima azione</th>
              <th className="px-5 py-2 text-right">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {views.map((view) => {
              const { document } = view;
              const openDocument = () => router.push(getDocumentHref(document.id));

              return (
                <tr
                  key={document.id}
                  role="link"
                  tabIndex={0}
                  aria-label={`Apri ${document.fileName}`}
                  className="atlas-row-interactive group cursor-pointer border-b border-border-subtle outline-none focus-visible:bg-accent-soft"
                  onClick={openDocument}
                  onKeyDown={(event) => openDocumentFromKeyboard(event, openDocument)}
                >
                  <td className="px-5 py-3.5 align-top">
                    <div className="flex min-w-0 items-start gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent transition group-hover:bg-card">
                        <FileText className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-foreground">
                          {document.fileName}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] text-muted">
                          {formatFileSize(document.fileSize)} · {formatDate(document.createdAt)}
                        </p>
                        <DocumentStatusBadge status={document.status} />
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3.5 align-top">
                    <DocumentIntelligenceIndicators view={view} />
                  </td>
                  <td className="min-w-[140px] px-3 py-3.5 align-top">
                    <DocumentWorkflowStrip stage={view.workflowStage} compact />
                  </td>
                  <td className="px-3 py-3.5 align-top">
                    <DocumentNextActionLink view={view} />
                    <p className="mt-1 max-w-[180px] text-[10px] leading-snug text-muted">
                      {view.nextAction.description}
                    </p>
                  </td>
                  <td className="px-5 py-3.5 align-top">
                    <div
                      className="flex items-center justify-end gap-1.5"
                      onClick={stopRowNavigation}
                    >
                      <DocumentButtonLink
                        documentId={document.id}
                        fileName={document.fileName}
                        kind="detail"
                      />
                      <DocumentButtonLink
                        documentId={document.id}
                        fileName={document.fileName}
                        kind="download"
                      />
                      <DocumentAnalysisForm
                        documentId={document.id}
                        documentStatus={document.status}
                        updatedAt={document.updatedAt}
                        linkedPolicyId={view.linkedPolicy?.id ?? null}
                        variant="icon"
                      />
                      <DocumentDeleteForm documentId={document.id} variant="icon" />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-border-subtle lg:hidden">
        {views.map((view) => {
          const { document } = view;
          const openDocument = () => router.push(getDocumentHref(document.id));

          return (
            <article
              key={document.id}
              role="link"
              tabIndex={0}
              aria-label={`Apri ${document.fileName}`}
              className="atlas-row-interactive group min-w-0 max-w-full cursor-pointer overflow-hidden px-4 py-4 outline-none focus-visible:bg-accent-soft"
              onClick={openDocument}
              onKeyDown={(event) => openDocumentFromKeyboard(event, openDocument)}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-foreground">
                        {document.fileName}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-muted">
                        {formatFileSize(document.fileSize)} · {formatDate(document.createdAt)}
                      </p>
                    </div>
                    <ChevronRight className="atlas-link-chevron mt-1 h-4 w-4 shrink-0 text-muted group-hover:text-accent" />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <DocumentStatusBadge status={document.status} />
                    {view.linkedPolicy ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent-soft px-2 py-0.5 text-[10px] font-medium text-accent">
                        <Sparkles className="h-3 w-3" />
                        Polizza collegata
                      </span>
                    ) : null}
                  </div>
                  <DocumentIntelligenceIndicators view={view} />
                  <div className="mt-3">
                    <DocumentWorkflowStrip stage={view.workflowStage} compact />
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <DocumentNextActionLink view={view} />
                  </div>
                </div>
              </div>
              <div
                className="mt-3 flex flex-col gap-2 border-t border-border-subtle pt-3 sm:flex-row sm:items-center sm:justify-between"
                onClick={stopRowNavigation}
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <DocumentButtonLink
                    documentId={document.id}
                    fileName={document.fileName}
                    kind="detail"
                  />
                  <DocumentButtonLink
                    documentId={document.id}
                    fileName={document.fileName}
                    kind="download"
                  />
                  <DocumentAnalysisForm
                    documentId={document.id}
                    documentStatus={document.status}
                    updatedAt={document.updatedAt}
                    linkedPolicyId={view.linkedPolicy?.id ?? null}
                    variant="icon"
                  />
                  <DocumentDeleteForm documentId={document.id} variant="icon" />
                </div>
                <MobileActionMenu view={view} />
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
