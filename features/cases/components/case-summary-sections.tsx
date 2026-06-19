import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CaseCommentItem } from "@/features/cases/types";
import type { EditableCase } from "@/features/cases/types";
import { getCaseStatusMeta } from "@/features/cases/constants";
import { formatCurrency } from "@/lib/currency";
import * as React from "react";

export function CaseBadges({ caseItem }: { caseItem: EditableCase }) {
  const statusMeta = getCaseStatusMeta(caseItem.currentStatus);

  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant={statusMeta?.tone ?? "secondary"}>
        {statusMeta?.label ?? caseItem.currentStatus}
      </Badge>
      {caseItem.isUrgent ? (
        <Badge variant="destructive">Urgente</Badge>
      ) : null}
    </div>
  );
}

export function CaseReferenceSummary({ caseItem }: { caseItem: EditableCase }) {
  return (
    <div className="grid gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
      <SummaryItem label="Clinica" value={caseItem.customerName || "Sem clinica"} />
      <SummaryItem label="Dentista" value={caseItem.dentistName || "Sem dentista"} />
      <SummaryItem label="Servico" value={caseItem.serviceTypeName || "Sem tipo"} />
      <SummaryItem
        label="Preco"
        value={formatCurrency(caseItem.casePrice, caseItem.labCurrency)}
      />
      <SummaryItem label="Criado em" value={formatDateTime(caseItem.createdAt)} />
      <SummaryItem
        label="Atualizado em"
        value={formatDateTime(caseItem.updatedAt)}
      />
    </div>
  );
}

export function CaseStatusHistorySection({
  caseItem,
}: {
  caseItem: EditableCase;
}) {
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3">
        <p className="font-medium">Historico de status</p>
        <p className="text-sm text-muted-foreground">
          Mudancas de status do caso, incluindo entradas repetidas em standby.
        </p>
      </div>

      {caseItem.statusHistory.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhuma mudanca de status registrada.
        </p>
      ) : (
        <div className="space-y-3">
          {caseItem.statusHistory.map((entry) => {
            const fromMeta = entry.fromStatus
              ? getCaseStatusMeta(entry.fromStatus)
              : null;
            const toMeta = getCaseStatusMeta(entry.toStatus);

            return (
              <div key={entry.id} className="rounded-lg border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {fromMeta ? (
                    <Badge variant={fromMeta.tone}>{fromMeta.shortLabel}</Badge>
                  ) : (
                    <Badge variant="outline">Created</Badge>
                  )}
                  <span className="text-muted-foreground">to</span>
                  <Badge variant={toMeta?.tone ?? "secondary"}>
                    {toMeta?.shortLabel ?? entry.toStatus}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(entry.changedAt)}
                  </span>
                </div>
                {entry.note ? (
                  <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                    {entry.note}
                  </p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function CaseMillingSection({ caseItem }: { caseItem: EditableCase }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3">
        <p className="font-medium">Fresagem</p>
        <p className="text-sm text-muted-foreground">
          Historico de producao deste caso.
        </p>
      </div>

      {caseItem.millings.length === 0 ? (
        <div className="text-sm text-muted-foreground">
          Nenhum registro de fresagem.
        </div>
      ) : (
        <div className="space-y-3">
          {caseItem.millings.map((milling) => (
            <div key={milling.id} className="rounded-lg border p-3 text-sm">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="font-medium">{milling.blockTypeName}</p>
                <Badge
                  variant={
                    milling.status === "SUCCESS" ? "secondary" : "destructive"
                  }
                >
                  {milling.status === "SUCCESS" ? "Sucesso" : "Falhou"}
                </Badge>
                {milling.blockTypeShade ? (
                  <Badge variant="outline">{milling.blockTypeShade}</Badge>
                ) : null}
              </div>

              <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="Blocos usados" value={milling.blocksUsedQty} />
                <Detail label="Dentes fresados" value={milling.teethMilledQty} />
                <Detail label="Broca" value={milling.millingDrillName ?? "-"} />
                <Detail label="Data" value={formatDateTime(milling.milledAt)} />
              </div>

              {milling.failureReason ? (
                <p className="mt-2 text-sm text-red-600">
                  Motivo da falha: {milling.failureReason}
                </p>
              ) : null}

              {milling.notes ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Notas: {milling.notes}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CaseCommentsSection({
  comments,
  onAddComment,
  onDeleteComment,
  isSubmitting,
  deletingCommentId,
  error,
}: {
  comments: CaseCommentItem[];
  onAddComment: (body: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  isSubmitting: boolean;
  deletingCommentId: string | null;
  error: string | null;
}) {
  const [body, setBody] = React.useState("");

  async function handleSubmit() {
    const trimmed = body.trim();
    if (!trimmed) return;

    await onAddComment(trimmed);
    setBody("");
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-3">
        <p className="font-medium">Comments</p>
        <p className="text-sm text-muted-foreground">
          Internal notes and case history.
        </p>
      </div>

      <div className="grid gap-2">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Add a note for this case"
          rows={3}
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            disabled={isSubmitting || !body.trim()}
            onClick={() => void handleSubmit()}
          >
            {isSubmitting ? "Posting..." : "Post comment"}
          </Button>
        </div>
      </div>

      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 grid gap-3">
        {comments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No comments yet.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-lg border p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{comment.authorName}</p>
                  <p className="text-xs text-muted-foreground">
                    {comment.authorRole} - {formatDateTime(comment.createdAt)}
                  </p>
                </div>
                {comment.canDelete ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => void onDeleteComment(comment.id)}
                    disabled={deletingCommentId === comment.id}
                  >
                    {deletingCommentId === comment.id ? "Deleting..." : "Delete"}
                  </Button>
                ) : null}
              </div>
              {comment.deletedAt ? (
                <p className="mt-2 text-sm italic text-muted-foreground">
                  Comment deleted.
                </p>
              ) : (
                <p className="mt-2 whitespace-pre-wrap text-sm">{comment.body}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p>{value}</p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="font-medium text-foreground">{label}:</span> {value}
    </div>
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}
