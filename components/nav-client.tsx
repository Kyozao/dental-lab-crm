"use client";

import { useState } from "react";
import Link from "next/link";
import { VelaWordmark } from "@/features/marketing/components/vela-icons";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

interface NavClientProps {
  userRole?: string;
}

export function NavClient({
  userRole,
}: NavClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const routes = getNavRoutes(userRole, pathname);

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur  supports-backdrop-filter:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 sm:py-4">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <VelaWordmark />
          </Link>

          <div className="hidden md:flex items-center gap-1">
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
          </div>

          {userRole ? (
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex md:hidden items-center justify-center rounded-md border border-border/60 p-2 text-muted-foreground hover:text-foreground hover:bg-accent/50"
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </button>
          ) : null}
        </div>

        {userRole && mobileOpen ? (
          <div className="mt-3 space-y-2 rounded-lg border border-border/60 bg-background p-3 md:hidden">
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
            </div>
          </div>
        ) : null}
      </div>
    </nav>
  );
}

function getNavRoutes(role?: string, pathname?: string) {
  if (!role) {
    return [];
  }

  if (role === "CAD_DESIGNER") {
    return [
      {
        href: "/dashboard",
        label: "My Stats",
        active: pathname === "/dashboard",
      },
      {
        href: "/kanban",
        label: "Kanban",
        active: pathname?.startsWith("/kanban") ?? false,
      },
    ];
  }

  return [
    {
      href: "/dashboard",
      label: "Dashboard",
      active: pathname === "/dashboard",
    },
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
