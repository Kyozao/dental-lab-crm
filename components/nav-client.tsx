"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { UserRole } from "@/app/generated/prisma/client";
import { createClient } from "@/lib/supabase/client";
import { Menu, X } from "lucide-react";
import type {
  CadDesignerOption,
  ClinicOption,
  ComponentOption,
  EditableCase,
  ServiceTypeOption,
} from "@/app/cases/case.shared";
import { CaseSearch } from "./case-search";

interface NavClientProps {
  userRole?: UserRole;
  currentUserRole?: string;
  cases?: EditableCase[];
  clinics?: ClinicOption[];
  serviceTypes?: ServiceTypeOption[];
  cadDesigners?: CadDesignerOption[];
  components?: ComponentOption[];
}

export function NavClient({
  userRole,
  currentUserRole,
  cases = [],
  clinics = [],
  serviceTypes = [],
  cadDesigners = [],
  components = [],
}: NavClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const routes = getNavRoutes(userRole, pathname);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setMobileOpen(false);
    router.push("/login");
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur  supports-backdrop-filter:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center p-2 rounded-lg bg-linear-to-br from-blue-600 to-blue-700 text-white font-bold text-sm">
              Synoa
            </div>
            <span className="hidden sm:inline font-semibold text-lg bg-linear-to-r from-blue-600 to-blue-700 bg-clip-text text-transparent">
              Dental Lab
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {userRole ? (
              <CaseSearch
                cases={cases}
                clinics={clinics}
                serviceTypes={serviceTypes}
                cadDesigners={cadDesigners}
                components={components}
                currentUserRole={currentUserRole ?? userRole}
              />
            ) : null}
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                suppressHydrationWarning
                className={`relative px-4 py-2 text-sm font-medium transition-colors rounded-md
                  ${
                    route.active
                      ? "text-foreground bg-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
                  }
                  ${
                    route.active
                      ? "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-linear-to-r after:from-blue-600 after:to-blue-700"
                      : ""
                  }
                `}
              >
                {route.label}
              </Link>
            ))}
            {userRole && (
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors rounded-md"
              >
                Logout
              </button>
            )}
          </div>

          {userRole ? (
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex md:hidden items-center justify-center rounded-md border border-border/60 p-2 text-muted-foreground hover:text-foreground hover:bg-accent/50"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          ) : null}
        </div>

        {userRole && mobileOpen ? (
          <div className="mt-3 space-y-2 rounded-lg border border-border/60 bg-background p-3 md:hidden">
            <div className="flex flex-wrap gap-2">
              <CaseSearch
                cases={cases}
                clinics={clinics}
                serviceTypes={serviceTypes}
                cadDesigners={cadDesigners}
                components={components}
                currentUserRole={currentUserRole ?? userRole}
              />
            </div>
            <div className="grid gap-1">
              {routes.map((route) => (
                <Link
                  key={route.href}
                  href={route.href}
                  onClick={() => setMobileOpen(false)}
                  suppressHydrationWarning
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    route.active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  }`}
                >
                  {route.label}
                </Link>
              ))}
              <button
                onClick={handleLogout}
                className="rounded-md px-3 py-2 text-left text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
              >
                Logout
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}

function getNavRoutes(role?: UserRole, pathname?: string) {
  if (!role) {
    return [];
  }

  // CAD_DESIGNER users only see Kanban
  if (role === "CAD_DESIGNER") {
    return [
      {
        href: "/kanban",
        label: "Kanban",
        active: pathname?.startsWith("/kanban") ?? false,
      },
    ];
  }

  // All other roles see all routes
  return [
    {
      href: "/cases",
      label: "Cases",
      active: pathname?.startsWith("/cases") ?? false,
    },
    {
      href: "/kanban",
      label: "Kanban",
      active: pathname?.startsWith("/kanban") ?? false,
    },
    {
      href: "/production",
      label: "Production",
      active: pathname?.startsWith("/production") ?? false,
    },
    {
      href: "/registry",
      label: "Registry",
      active: pathname?.startsWith("/registry") ?? false,
    },
  ];
}
