import { Download, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AttachmentKindValue } from "@/features/cases/types";
import type { EditableCase } from "@/features/cases/types";

export function AttachmentList({
  attachments,
  emptyMessage,
  onDownload,
  onDelete,
  deletingAttachmentId,
  canDelete,
}: {
  attachments: EditableCase["attachments"];
  emptyMessage: string;
  onDownload: (filePath: string) => void | Promise<void>;
  onDelete: (attachmentId: string, fileName: string) => void | Promise<void>;
  deletingAttachmentId: string | null;
  canDelete: boolean;
}) {
  if (attachments.length === 0) {
    return <div className="text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-3">
      {attachments.map((attachment) => (
        <div
          key={attachment.id}
          className="flex items-center justify-between gap-3 rounded-lg border p-3"
        >
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <div className="truncate font-medium">{attachment.fileName}</div>
              <Badge variant="outline">
                {getAttachmentKindLabel(attachment.kind)}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground">
              {attachment.fileType || "arquivo"} -{" "}
              {formatBytes(attachment.fileSize)} -{" "}
              {new Intl.DateTimeFormat("pt-BR").format(
                new Date(attachment.createdAt),
              )}
              {attachment.retentionUntil
                ? ` - historico ate ${new Intl.DateTimeFormat("pt-BR").format(new Date(attachment.retentionUntil))}`
                : ""}
              {attachment.uploadedByName
                ? ` - ${attachment.uploadedByName}`
                : ""}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void onDownload(attachment.filePath)}
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar
            </Button>

            {canDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() =>
                  void onDelete(attachment.id, attachment.fileName)
                }
                disabled={deletingAttachmentId === attachment.id}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {deletingAttachmentId === attachment.id
                  ? "Excluindo..."
                  : "Excluir"}
              </Button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatBytes(bytes: number | null) {
  if (!bytes) return "-";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentKindLabel(kind: AttachmentKindValue) {
  switch (kind) {
    case "SCAN_INPUT":
      return "Scan";
    case "DESIGN_OUTPUT":
    case "MODEL_OUTPUT":
      return "Final";
    default:
      return "Arquivo";
  }
}
