import { notFound } from "next/navigation";
import Link from "next/link";
import { Download, FileText, PlusCircle, Sparkles } from "lucide-react";
import { DocumentAnalysisFailureBanner } from "@/components/documents/DocumentAnalysisFailureBanner";
import { DocumentDeleteForm } from "@/components/documents/DocumentDeleteForm";
import { DocumentAnalysisForm } from "@/components/documents/DocumentAnalysisForm";
import { DocumentIntelligenceSummary } from "@/components/documents/DocumentIntelligenceSummary";
import { DocumentPolicyConnection } from "@/components/documents/DocumentPolicyConnection";
import { DocumentStatusBadge } from "@/components/documents/DocumentStatusBadge";
import { DocumentWorkflowStrip } from "@/components/documents/DocumentWorkflowStrip";
import { ActionBar, ActionButton } from "@/components/ui/ActionBar";
import { InfoGrid } from "@/components/ui/InfoGrid";
import { PageHeader } from "@/components/ui/PageHeader";
import { PageShell } from "@/components/ui/PageShell";
import { SectionCard } from "@/components/ui/SectionCard";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import { RevealStagger } from "@/components/motion/RevealStagger";
import { atlasAsideColumn, atlasMainAside, atlasMainColumn } from "@/lib/atlas-ui";
import { getCurrentUserDocumentById } from "@/lib/documents";
import {
  buildDocumentIntelligence,
  getPoliciesByDocumentId,
} from "@/lib/document-intelligence";
import { getCurrentUserPolicies } from "@/lib/policies";
import { formatDateTime, formatFileSize, formatRelativeTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export const metadata = { title: "Dettaglio documento" };

function getStatusGuidance(view: ReturnType<typeof buildDocumentIntelligence>) {
  return view.nextAction.description;
}

export default async function DocumentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const document = await getCurrentUserDocumentById(id);

  if (!document) {
    notFound();
  }

  const policies = await getCurrentUserPolicies();
  const policyByDocument = getPoliciesByDocumentId(policies);
  const linkedPolicy = policyByDocument.get(document.id) ?? null;
  const view = buildDocumentIntelligence(document, linkedPolicy);

  return (
    <PageShell backHref="/documents" backLabel="Torna ai documenti">
      <RevealStagger>
        <PageHeader
          title={document.fileName}
          description={getStatusGuidance(view)}
          meta={
            <div className="flex flex-wrap items-center gap-2">
              <DocumentStatusBadge status={document.status} />
              {linkedPolicy ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-accent/20 bg-accent-soft px-2.5 py-1 text-[11px] font-medium text-accent">
                  <Sparkles className="h-3.5 w-3.5" />
                  Analisi collegata
                </span>
              ) : null}
            </div>
          }
        />

        {view.nextAction.kind !== "wait" && view.nextAction.href ? (
          <div className="atlas-action-strip flex flex-col gap-3 rounded-xl border border-accent/20 bg-accent-soft/30 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                Prossima azione
              </p>
              <p className="mt-0.5 text-[14px] font-semibold text-foreground">
                {view.nextAction.label}
              </p>
              <p className="mt-0.5 text-[12px] text-muted">{view.nextAction.description}</p>
            </div>
            <Link
              href={view.nextAction.href}
              className={cn(
                "inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2.5 text-[12px] font-semibold transition",
                view.nextAction.priority === "primary"
                  ? "atlas-btn-primary"
                  : "atlas-btn-secondary"
              )}
            >
              {view.nextAction.label}
            </Link>
          </div>
        ) : null}

        {document.status === "failed" || document.analysisError ? (
          <DocumentAnalysisFailureBanner analysisError={document.analysisError} />
        ) : null}

        <div className={atlasMainAside}>
          <div className={atlasMainColumn}>
            <SectionCard title="Workflow documento" padding="sm">
              <DocumentWorkflowStrip stage={view.workflowStage} />
            </SectionCard>

            {(document.status === "analyzed" || linkedPolicy) && (
              <DocumentIntelligenceSummary view={view} />
            )}

            <SectionCard title="Informazioni file">
              <InfoGrid
                items={[
                  { label: "Nome", value: document.fileName, span: 2 },
                  { label: "Dimensione", value: formatFileSize(document.fileSize) },
                  { label: "Formato", value: document.mimeType ?? "application/pdf" },
                  {
                    label: "Caricato",
                    value: (
                      <span>
                        {formatRelativeTime(document.createdAt)}
                        <span className="mt-0.5 block text-[11px] font-normal text-muted">
                          {formatDateTime(document.createdAt)}
                        </span>
                      </span>
                    ),
                  },
                  {
                    label: "Aggiornato",
                    value: formatDateTime(document.updatedAt),
                  },
                ]}
              />

              <div className="mt-4 flex items-start gap-3 rounded-xl border border-border bg-accent-soft/40 p-3">
                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <p className="text-[12px] leading-relaxed text-muted">
                  {getStatusGuidance(view)}
                </p>
              </div>
            </SectionCard>
          </div>

          <aside className={atlasAsideColumn}>
            <DocumentPolicyConnection view={view} />

            <SectionCard title="Azioni" padding="sm">
              <ActionBar>
                <DocumentAnalysisForm
                  documentId={document.id}
                  documentStatus={document.status}
                  updatedAt={document.updatedAt}
                  linkedPolicyId={linkedPolicy?.id ?? null}
                />
                {!linkedPolicy ? (
                  <ActionButton
                    href={`/policies/new?documentId=${document.id}`}
                    variant="secondary"
                  >
                    <PlusCircle className="h-4 w-4" />
                    Crea polizza manuale
                  </ActionButton>
                ) : null}
                <a
                  href={`/documents/${document.id}/download`}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 text-[13px] font-medium text-muted-foreground hover:bg-card-muted"
                >
                  <Download className="h-4 w-4" />
                  Scarica PDF
                </a>
                <DocumentDeleteForm documentId={document.id} redirectToDocuments />
              </ActionBar>
            </SectionCard>
          </aside>
        </div>

        <CollapsibleSection
          title="Dettagli tecnici storage"
          description="Percorso interno del file"
        >
          <p className="break-all font-mono text-[11px] text-muted">
            {document.filePath}
          </p>
        </CollapsibleSection>
      </RevealStagger>
    </PageShell>
  );
}
