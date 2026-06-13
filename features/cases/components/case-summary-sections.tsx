import { Badge } from "@/components/ui/badge";
import type { EditableCase } from "@/features/cases/types";

export function CaseBadges({ caseItem }: { caseItem: EditableCase }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Badge variant="secondary">{caseItem.currentStatus}</Badge>
      {caseItem.isUrgent ? (
        <Badge variant="destructive">Urgente</Badge>
      ) : null}
      {caseItem.pendingNote ? <Badge variant="outline">Pendente</Badge> : null}
    </div>
  );
}

export function CaseReferenceSummary({ caseItem }: { caseItem: EditableCase }) {
  return (
    <div className="grid gap-3 rounded-xl border p-4 text-sm sm:grid-cols-2 lg:grid-cols-3">
      <SummaryItem label="Clinica" value={caseItem.customerName || "Sem clinica"} />
      <SummaryItem label="Dentista" value={caseItem.dentistName || "Sem dentista"} />
      <SummaryItem label="Servico" value={caseItem.serviceTypeName || "Sem tipo"} />
      <SummaryItem label="Criado em" value={formatDateTime(caseItem.createdAt)} />
      <SummaryItem
        label="Atualizado em"
        value={formatDateTime(caseItem.updatedAt)}
      />
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
