"use client";

import { useMemo, useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import { archiveDentistApi, updateDentistApi } from "@/features/customers/services/dentists-api";
import type { Dentist } from "@/features/customers/types";

import { DentistForm } from "./dentist-form";

type EditDentistDialogProps = {
  dentist: Dentist | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: (kind: "updated" | "archived") => Promise<void>;
};

export function EditDentistDialog({
  dentist,
  open,
  onOpenChange,
  onChanged,
}: EditDentistDialogProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const initialValue = useMemo(
    () =>
      dentist
        ? {
            name: dentist.name,
            phone: dentist.phone ?? "",
            email: dentist.email ?? "",
            notes: dentist.notes ?? "",
            is_active: dentist.is_active,
          }
        : undefined,
    [dentist],
  );

  if (!dentist) return null;

  async function handleDelete() {
    if (!dentist) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await archiveDentistApi(dentist.id);
      setConfirmDeleteOpen(false);
      onOpenChange(false);
      await onChanged("archived");
    } catch (deleteDentistError) {
      setDeleteError(
        deleteDentistError instanceof Error
          ? deleteDentistError.message
          : "Failed to archive dentist.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(nextOpen) => {
          onOpenChange(nextOpen);
          if (!nextOpen) {
            setConfirmDeleteOpen(false);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit dentist</DialogTitle>
            <DialogDescription>
              Update dentist details or archive the dentist when it should no longer appear in active lists.
            </DialogDescription>
          </DialogHeader>

          <DentistForm
            open={open}
            initialValue={initialValue}
            submitLabel="Save changes"
            submitErrorMessage="Failed to update dentist."
            onSubmit={(payload) => updateDentistApi(dentist.id, payload)}
            onSuccess={async () => {
              onOpenChange(false);
              await onChanged("updated");
            }}
          />

          <div className="border-t border-border/40 pt-4">
            <Button type="button" variant="outline" onClick={() => setConfirmDeleteOpen(true)}>
              Delete dentist
            </Button>
            {deleteError ? (
              <p className="mt-2 text-sm text-destructive">{deleteError}</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteOpen} onOpenChange={setConfirmDeleteOpen}>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete dentist</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive {dentist.name} and remove it from active dentist lists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting..." : "Delete dentist"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
