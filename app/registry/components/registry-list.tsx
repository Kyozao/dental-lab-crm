"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EditRegistryDialog, type FieldDef } from "./edit-registry-dialog";
import type { RegistryEntity } from "./registry-types";

export type RegistryRow = {
  id: string;
  cells: React.ReactNode[];
  values: Record<string, string | number | boolean | null | undefined>;
};

type Props = {
  columnLabels: string[];
  rows: RegistryRow[];
  entity: RegistryEntity;
  entityLabel: string;
  fields: FieldDef[];
};

export function RegistryList({
  columnLabels,
  rows,
  entity,
  entityLabel,
  fields,
}: Props) {
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const editingRow = rows.find((r) => r.id === editingId) ?? null;

  return (
    <>
      <div className="rounded-lg border border-border/40 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {columnLabels.map((col) => (
                  <TableHead key={col}>{col}</TableHead>
                ))}
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id}>
                  {row.cells.map((cell, i) => (
                    <TableCell key={i}>{cell}</TableCell>
                  ))}
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingId(row.id)}
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {rows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columnLabels.length + 1}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No {entityLabel.toLowerCase()}s registered yet.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </div>

      {editingRow ? (
        <EditRegistryDialog
          key={editingId}
          open={Boolean(editingId)}
          onOpenChange={(open) => {
            if (!open) setEditingId(null);
          }}
          id={editingRow.id}
          entity={entity}
          entityLabel={entityLabel}
          fields={fields}
          values={editingRow.values}
        />
      ) : null}
    </>
  );
}
