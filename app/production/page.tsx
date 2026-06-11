import { ProductionPageClient } from "@/features/production/components/production-page-client";
import { Suspense } from "react";

export default function ProductionPage() {
  return (
    <Suspense>
      <ProductionPageClient />
    </Suspense>
  );
}
