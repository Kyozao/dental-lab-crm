"use client";

import { UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { createEmployeeApi } from "@/features/employees/services/employees-api";

import { EmployeeForm } from "./employee-form";

type AddEmployeeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => Promise<void>;
};

export function AddEmployeeDialog({
  open,
  onOpenChange,
  onCreated,
}: AddEmployeeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add employee</DialogTitle>
          <DialogDescription>
            Send a login invite and add the employee to this lab.
          </DialogDescription>
        </DialogHeader>
        <EmployeeForm
          open={open}
          onSubmit={createEmployeeApi}
          onSuccess={async () => {
            onOpenChange(false);
            await onCreated();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

export function AddEmployeeButton(props: {
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <Button type="button" onClick={props.onClick} disabled={props.disabled}>
      <UserPlus className="h-4 w-4" />
      Add employee
    </Button>
  );
}
