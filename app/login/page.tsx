import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-lg border border-border/60 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Demo mode</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Authentication is disabled in the API-only mock runtime.
        </p>
        <Link
          href="/kanban"
          className="mt-6 inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Open Kanban
        </Link>
      </div>
    </main>
  );
}
