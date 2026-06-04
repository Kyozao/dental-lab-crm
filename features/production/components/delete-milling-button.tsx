"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteMilling } from "@/features/production/services/production-api";

export function DeleteMillingButton({ millingId }: { millingId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleDelete() {
    setPending(true);

    try {
      await deleteMilling(millingId);
      router.refresh();
    } catch (error) {
      console.error(error);
    } finally {
      setPending(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      type="button"
      className="text-destructive hover:text-destructive"
      onClick={handleDelete}
      disabled={pending}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
