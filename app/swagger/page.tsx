import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SwaggerViewer } from "./swagger-ui";

export const metadata: Metadata = {
  title: "Swagger | Synoa Dental Lab CRM",
  description: "Interactive OpenAPI documentation for the dental lab CRM.",
};

export default function SwaggerPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl space-y-4 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-xl border bg-background p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                API Swagger
              </h1>
              <p className="text-sm text-muted-foreground">
                Interactive docs powered by `openapi.yaml` for web and future
                mobile integration.
              </p>
            </div>

            <Link
              href="/api/openapi"
              target="_blank"
              className="inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent"
            >
              Open raw spec
            </Link>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            Swagger is available only outside production. Update `openapi.yaml`
            and `docs/api-contracts.md` whenever the API changes.
          </p>
        </section>

        <SwaggerViewer />
      </div>
    </main>
  );
}
