import { CreateLabForm } from "@/features/onboarding/components/create-lab-form";
import { redirectIfOnboarded } from "@/lib/onboarding";

export default async function CreateLabPage() {
  await redirectIfOnboarded();

  return (
    <main className="flex min-h-full items-center justify-center p-6">
      <section className="w-full max-w-md rounded-xl border border-border/60 bg-card p-6 shadow-sm">
        <p className="text-sm font-medium text-muted-foreground">First setup</p>
        <h1 className="mt-2 text-2xl font-semibold">Create your lab</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your user account is ready. Create one lab to start using the CRM.
        </p>

        <div className="mt-6">
          <CreateLabForm />
        </div>
      </section>
    </main>
  );
}
