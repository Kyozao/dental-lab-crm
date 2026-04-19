"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { deleteRegistryEntity, updateRegistryEntity } from "./registry-api";
import type { RegistryActionState } from "./registry-types";
import type { RegistryEntity } from "./registry-types";

export type FieldDef = {
  name: string;
  label: string;
  type?: "text" | "email" | "number" | "checkbox" | "textarea" | "select";
  placeholder?: string;
  optional?: boolean;
  options?: Array<{ value: string; label: string }>;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: RegistryEntity;
  id: string;
  entityLabel: string;
  fields: FieldDef[];
  values: Record<string, string | number | boolean | null | undefined>;
};

const initialState: RegistryActionState = { success: false, message: "" };

export function EditRegistryDialog({
  open,
  onOpenChange,
  entity,
  id,
  entityLabel,
  fields,
  values,
}: Props) {
  const [state, setState] = React.useState<RegistryActionState>(initialState);
  const [pending, setPending] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (state.success) onOpenChange(false);
  }, [state.success, onOpenChange]);

  React.useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
      setDeleteError(null);
    }
  }, [open]);

  async function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      await deleteRegistryEntity(entity, id);
      onOpenChange(false);
    } catch (err) {
      setDeleteError(
        err instanceof Error
          ? err.message.includes("Foreign key constraint")
            ? `Cannot delete: this ${entityLabel.toLowerCase()} is still in use.`
            : err.message
          : `Failed to delete ${entityLabel.toLowerCase()}.`,
      );
      setConfirmDelete(false);
    } finally {
      setIsDeleting(false);
    }
  }

  function getDefaultValue(field: FieldDef): string {
    const v = values[field.name];
    if (v == null) return "";
    if (typeof v === "boolean") return v ? "on" : "";
    return String(v);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const formData = new FormData(event.currentTarget);
    const result = await updateRegistryEntity(entity, id, formData);
    setState(result);
    setPending(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {entityLabel}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="hidden" name="id" value={id} />

          {state.message && !state.success ? (
            <Alert className="border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {state.message}
              </AlertDescription>
            </Alert>
          ) : null}

          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={`edit-${id}-${field.name}`}>
                {field.label}
                {field.optional ? (
                  <span className="text-muted-foreground"> (optional)</span>
                ) : null}
              </Label>

              {field.type === "textarea" ? (
                <Textarea
                  id={`edit-${id}-${field.name}`}
                  name={field.name}
                  placeholder={field.placeholder}
                  defaultValue={getDefaultValue(field)}
                  rows={3}
                  required={!field.optional}
                />
              ) : field.type === "checkbox" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={`edit-${id}-${field.name}`}
                    name={field.name}
                    defaultChecked={values[field.name] === true}
                    value="on"
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label
                    htmlFor={`edit-${id}-${field.name}`}
                    className="font-normal"
                  >
                    {field.placeholder ?? field.label}
                  </Label>
                </div>
              ) : field.type === "select" ? (
                <select
                  id={`edit-${id}-${field.name}`}
                  name={field.name}
                  defaultValue={getDefaultValue(field)}
                  required={!field.optional}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  {field.optional ? <option value="">—</option> : null}
                  {field.options?.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              ) : (
                <Input
                  id={`edit-${id}-${field.name}`}
                  name={field.name}
                  type={field.type ?? "text"}
                  placeholder={field.placeholder}
                  defaultValue={getDefaultValue(field)}
                  required={!field.optional}
                />
              )}

              {state.errors?.[field.name]?.map((error) => (
                <p key={error} className="text-sm text-red-500">
                  {error}
                </p>
              ))}
            </div>
          ))}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button type="submit" disabled={pending || isDeleting}>
              {pending ? "Saving..." : "Save changes"}
            </Button>

            <div className="flex items-center gap-2">
              {deleteError ? (
                <p className="text-sm text-red-500">{deleteError}</p>
              ) : null}

              {confirmDelete ? (
                <>
                  <span className="text-sm text-muted-foreground">Sure?</span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isDeleting}
                    onClick={handleDelete}
                  >
                    {isDeleting ? "Deleting..." : "Yes, delete"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={pending || isDeleting}
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
