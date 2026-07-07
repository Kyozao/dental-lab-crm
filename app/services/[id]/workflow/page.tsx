import { redirect } from "next/navigation";
import { requireCurrentLab } from "@/lib/onboarding";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ServiceWorkflowPage({ params }: Props) {
  await requireCurrentLab();
  const { id } = await params;
  redirect(`/services/${id}`);
}
