import { MillingPageClient } from "@/features/production/components/milling-page-client";
import { requireCurrentLab } from "@/lib/onboarding";
import { Suspense } from "react";

export default async function MillingPage() {
  await requireCurrentLab();

  return (
    <Suspense>
      <MillingPageClient />
    </Suspense>
  );
}
