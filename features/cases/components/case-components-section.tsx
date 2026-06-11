import { Button } from "@/components/ui/button";
import type { ComponentOption } from "@/features/cases/types";

import type { CaseComponentDraft } from "./case-details-dialog.utils";

type Props = {
  rows: CaseComponentDraft[];
  components: ComponentOption[];
  canEditAll: boolean;
  canSelectComponents: boolean;
  onAddRow: () => void;
  onRemoveRow: (localId: string) => void;
  onUpdateRow: (
    localId: string,
    updater: (row: CaseComponentDraft) => CaseComponentDraft,
  ) => void;
};

export function CaseComponentsSection({
  rows,
  components,
  canEditAll,
  canSelectComponents,
  onAddRow,
  onRemoveRow,
  onUpdateRow,
}: Props) {
  function handleComponentSelected(localId: string, componentId: string) {
    const component = components.find((item) => item.id === componentId);

    onUpdateRow(localId, (row) => ({
      ...row,
      componentId,
      unitCost: canEditAll
        ? row.unitCost || component?.defaultCost || ""
        : row.unitCost,
      unitPrice: canEditAll
        ? row.unitPrice || component?.defaultPrice || ""
        : row.unitPrice,
    }));
  }

  return (
    <div className="rounded-xl border p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-medium">Componentes do caso</p>
          <p className="text-sm text-muted-foreground">
            {canEditAll
              ? "Defina o que foi usado e o que deve ser cobrado da clinica."
              : "Selecione os componentes usados neste caso."}
          </p>
        </div>

        {canSelectComponents ? (
          <Button type="button" variant="outline" onClick={onAddRow}>
            Adicionar componente
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed px-4 py-3 text-sm text-muted-foreground">
          Nenhum componente adicionado.
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row, index) => (
            <div key={row.localId} className="rounded-lg border p-3">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-medium">Item #{index + 1}</p>

                {canSelectComponents ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveRow(row.localId)}
                  >
                    Remover
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Componente</label>
                  <select
                    value={row.componentId}
                    onChange={(event) =>
                      handleComponentSelected(row.localId, event.target.value)
                    }
                    disabled={!canSelectComponents}
                    className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                  >
                    <option value="">Selecione</option>
                    {components.map((component) => (
                      <option key={component.id} value={component.id}>
                        {component.name}
                      </option>
                    ))}
                  </select>
                </div>

                {canEditAll ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quantidade</label>
                      <input
                        type="number"
                        min={1}
                        value={row.quantity}
                        onChange={(event) => {
                          const parsed = Number(event.target.value);
                          onUpdateRow(row.localId, (current) => ({
                            ...current,
                            quantity:
                              Number.isInteger(parsed) && parsed > 0
                                ? parsed
                                : 1,
                          }));
                        }}
                        disabled={!canEditAll}
                        className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">
                        Cobrar da clinica
                      </label>
                      <div className="flex h-10 items-center gap-2 rounded-md border bg-background px-3 py-2">
                        <input
                          type="checkbox"
                          checked={row.chargeClient}
                          onChange={(event) =>
                            onUpdateRow(row.localId, (current) => ({
                              ...current,
                              chargeClient: event.target.checked,
                            }))
                          }
                          disabled={!canEditAll}
                          className="h-4 w-4"
                        />
                        <span className="text-sm">Incluir na cobranca</span>
                      </div>
                    </div>

                    <MoneyInput
                      label="Custo unitario"
                      value={row.unitCost}
                      onChange={(value) =>
                        onUpdateRow(row.localId, (current) => ({
                          ...current,
                          unitCost: value,
                        }))
                      }
                      disabled={!canEditAll}
                    />
                    <MoneyInput
                      label="Preco unitario"
                      value={row.unitPrice}
                      onChange={(value) =>
                        onUpdateRow(row.localId, (current) => ({
                          ...current,
                          unitPrice: value,
                        }))
                      }
                      disabled={!canEditAll}
                    />

                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-medium">
                        Observacoes do item
                      </label>
                      <textarea
                        value={row.notes}
                        onChange={(event) =>
                          onUpdateRow(row.localId, (current) => ({
                            ...current,
                            notes: event.target.value,
                          }))
                        }
                        disabled={!canEditAll}
                        className="min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
                      />
                    </div>
                  </>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MoneyInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input
        type="number"
        step="0.01"
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm disabled:opacity-60"
      />
    </div>
  );
}
