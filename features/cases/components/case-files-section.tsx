import { Paperclip } from "lucide-react";

import type { EditableCase } from "@/features/cases/types";

import { AttachmentList } from "./case-details-attachments";

type Props = {
  scanAttachments: EditableCase["attachments"];
  finalAttachments: EditableCase["attachments"];
  otherAttachments: EditableCase["attachments"];
  canUploadScan: boolean;
  canUploadFinal: boolean;
  isUploading: boolean;
  deletingAttachmentId: string | null;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onDownload: (filePath: string) => void | Promise<void>;
  onDeleteAttachment: (
    attachmentId: string,
    fileName: string,
  ) => void | Promise<void>;
};

export function CaseFilesSection({
  scanAttachments,
  finalAttachments,
  otherAttachments,
  canUploadScan,
  canUploadFinal,
  isUploading,
  deletingAttachmentId,
  onFileChange,
  onDownload,
  onDeleteAttachment,
}: Props) {
  return (
    <div className="rounded-xl border p-4">
      <div className="mb-4">
        <p className="font-medium">Arquivos do caso</p>
        <p className="text-sm text-muted-foreground">
          Primeiro envie o scan compactado, depois o CAD envia o arquivo final
          `.zip`/`.rar`. O historico fica disponivel por pelo menos 90 dias.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <FileUploadPanel
          title="1. Scan do caso"
          description="Envie o scan em `.zip`, `.rar` ou `.7z`."
          buttonText={isUploading ? "Enviando..." : "Enviar scan"}
          canUpload={canUploadScan}
          isUploading={isUploading}
          onFileChange={onFileChange}
        >
          <AttachmentList
            attachments={scanAttachments}
            emptyMessage="Nenhum scan enviado ainda."
            onDownload={onDownload}
            onDelete={onDeleteAttachment}
            deletingAttachmentId={deletingAttachmentId}
            canDelete={canUploadFinal}
          />
        </FileUploadPanel>

        <FileUploadPanel
          title="2. Arquivo final"
          description="Envie a entrega final em `.zip`, `.rar` ou `.7z`."
          buttonText={isUploading ? "Enviando..." : "Enviar final"}
          canUpload={canUploadFinal}
          isUploading={isUploading}
          onFileChange={onFileChange}
        >
          <AttachmentList
            attachments={finalAttachments}
            emptyMessage="Nenhum arquivo final enviado ainda."
            onDownload={onDownload}
            onDelete={onDeleteAttachment}
            deletingAttachmentId={deletingAttachmentId}
            canDelete={canUploadFinal}
          />
        </FileUploadPanel>
      </div>

      {otherAttachments.length > 0 ? (
        <div className="mt-4 rounded-lg border p-3">
          <div className="mb-3">
            <p className="font-medium">Outros anexos</p>
            <p className="text-xs text-muted-foreground">
              Arquivos extras vinculados ao caso.
            </p>
          </div>

          <AttachmentList
            attachments={otherAttachments}
            emptyMessage="Sem anexos extras."
            onDownload={onDownload}
            onDelete={onDeleteAttachment}
            deletingAttachmentId={deletingAttachmentId}
            canDelete={canUploadFinal}
          />
        </div>
      ) : null}
    </div>
  );
}

function FileUploadPanel({
  title,
  description,
  buttonText,
  canUpload,
  isUploading,
  onFileChange,
  children,
}: {
  title: string;
  description: string;
  buttonText: string;
  canUpload: boolean;
  isUploading: boolean;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{description}</p>
        </div>

        {canUpload ? (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm">
            <Paperclip className="h-4 w-4" />
            {buttonText}
            <input
              type="file"
              accept=".zip,.rar,.7z"
              className="hidden"
              onChange={onFileChange}
              disabled={isUploading}
            />
          </label>
        ) : null}
      </div>

      {children}
    </div>
  );
}
