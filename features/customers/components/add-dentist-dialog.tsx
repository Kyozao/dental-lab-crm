"use client";

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { createDentistApi } from "@/features/customers/services/dentists-api";

import { DentistForm } from "./dentist-form";

type AddDentistDialogProps = {
  customerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void>;
};

export function AddDentistDialog({
  customerId,
  open,
  onOpenChange,
  onCreated,
}: AddDentistDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add dentist</DialogTitle>
          <DialogDescription>
            Create a customer-owned dentist contact for new and existing cases.
          </DialogDescription>
        </DialogHeader>

        <DentistForm
          open={open}
          submitLabel="Create dentist"
          submitErrorMessage="Failed to create dentist."
          onSubmit={(payload) => createDentistApi(customerId, payload)}
          onSuccess={async () => {
            onOpenChange(false);
            await onCreated();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export function AddDentistButton(props: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button type="button" {...props}>
      Add dentist
    </Button>
  );
}
