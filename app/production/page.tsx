import { ProductionPageClient } from "@/features/production/components/production-page-client";
import { requireCurrentLab } from "@/lib/onboarding";
import { Suspense } from "react";

export default async function ProductionPage() {
  await requireCurrentLab();

  return (
    <Suspense>
      <ProductionPageClient />
    </Suspense>
  );
}
