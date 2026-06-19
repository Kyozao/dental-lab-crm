"use client";

import { Building2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createCustomerApi } from "@/features/customers/services/customers-api";

import { CustomerForm } from "./customer-form";

type AddCustomerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void>;
};

export function AddCustomerDialog({
  open,
  onOpenChange,
  onCreated,
}: AddCustomerDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add customer</DialogTitle>
          <DialogDescription>
            Create a customer account and keep its contacts available for cases.
          </DialogDescription>
        </DialogHeader>

        <CustomerForm
          open={open}
          submitLabel="Create customer"
          submitErrorMessage="Failed to create customer."
          onSubmit={createCustomerApi}
          onSuccess={async () => {
            onOpenChange(false);
            await onCreated();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export function AddCustomerButton(props: {
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button type="button" onClick={props.onClick} disabled={props.disabled}>
      <Building2 className="h-4 w-4" />
      Add customer
    </Button>
  );
}
