"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";

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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { archiveCustomerApi, updateCustomerApi } from "@/features/customers/services/customers-api";
import type { Customer } from "@/features/customers/types";

import { CustomerForm } from "./customer-form";

type EditCustomerDialogProps = {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: (kind: "updated" | "archived") => Promise<void>;
};

export function EditCustomerDialog({
  customer,
  open,
  onOpenChange,
  onChanged,
}: EditCustomerDialogProps) {
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const initialValue = useMemo(
    () =>
      customer
        ? {
            name: customer.name,
            phone: customer.phone ?? "",
            email: customer.email ?? "",
            notes: customer.notes ?? "",
            price_table_id: customer.price_table?.id ?? null,
            is_active: customer.is_active,
          }
        : undefined,
    [customer],
  );

  if (!customer) return null;

  async function handleDelete() {
    if (!customer) return;

    setDeleting(true);
    setDeleteError(null);

    try {
      await archiveCustomerApi(customer.id);
      setConfirmDeleteOpen(false);
      onOpenChange(false);
      await onChanged("archived");
    } catch (deleteCustomerError) {
      setDeleteError(
        deleteCustomerError instanceof Error
          ? deleteCustomerError.message
          : "Failed to archive customer.",
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
            <DialogTitle>Edit customer</DialogTitle>
            <DialogDescription>
              Update customer details or archive the customer when it should no longer appear in active lists.
            </DialogDescription>
          </DialogHeader>

          <CustomerForm
            open={open}
            initialValue={initialValue}
            submitLabel="Save changes"
            submitErrorMessage="Failed to update customer."
            onSubmit={(payload) => updateCustomerApi(customer.id, payload)}
            onSuccess={async () => {
              onOpenChange(false);
              await onChanged("updated");
            }}
          />

          <div className="border-t border-border/40 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmDeleteOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Delete customer
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
            <AlertDialogTitle>Delete customer</AlertDialogTitle>
            <AlertDialogDescription>
              This will archive {customer.name} and remove it from active customer lists.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? "Deleting..." : "Delete customer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
