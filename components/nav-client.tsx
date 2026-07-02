"use client";

import { useState } from "react";
import Link from "next/link";
import { VelaWordmark } from "@/features/marketing/components/vela-icons";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface NavClientProps {
  userRole?: string;
  userEmail?: string | null;
  userName?: string | null;
}

export function NavClient({ userRole, userEmail, userName }: NavClientProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const routes = getNavRoutes(userRole, pathname);
  const supabase = createClient();
  const avatarLabel = userName ?? userEmail ?? "Profile";
  const avatarInitials = getInitials(avatarLabel);

  async function handleLogout() {
    try {
      setLoggingOut(true);

      const { error } = await supabase.auth.signOut();

      if (error) {
        throw error;
      }

      setMobileOpen(false);
      router.push("/login");
      router.refresh();
    } catch (logoutError) {
      toast.error(
        logoutError instanceof Error
          ? logoutError.message
          : "Failed to log out.",
      );
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/95 backdrop-blur  supports-backdrop-filter:bg-background/60">
      <div className="mx-auto max-w-384 px-4 py-3 sm:px-6 sm:py-4">
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
            <div className="flex items-center gap-2">
              <ProfileDropdown
                avatarInitials={avatarInitials}
                avatarLabel={avatarLabel}
                loggingOut={loggingOut}
                onLogout={handleLogout}
                userEmail={userEmail}
                userName={userName}
              />

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
            </div>
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

  if (role === "PRODUCTION") {
    return [
      {
        href: "/cases",
        label: "Cases",
        active: pathname?.startsWith("/cases") ?? false,
      },
      {
        href: "/messages",
        label: "Messages",
        active: pathname?.startsWith("/messages") ?? false,
      },
      {
        href: "/production",
        label: "Production",
        active: pathname?.startsWith("/production") ?? false,
      },
      {
        href: "/milling",
        label: "Milling",
        active: pathname?.startsWith("/milling") ?? false,
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
      href: "/messages",
      label: "Messages",
      active: pathname?.startsWith("/messages") ?? false,
    },
    {
      href: "/production",
      label: "Production",
      active: pathname?.startsWith("/production") ?? false,
    },
    {
      href: "/milling",
      label: "Milling",
      active: pathname?.startsWith("/milling") ?? false,
    },
    {
      href: "/schedule",
      label: "Schedule",
      active: pathname?.startsWith("/schedule") ?? false,
    },
    {
      href: "/customers",
      label: "Customers",
      active: pathname?.startsWith("/customers") ?? false,
    },
    {
      href: "/services",
      label: "Services",
      active: pathname?.startsWith("/services") ?? false,
    },
    {
      href: "/employees",
      label: "Employees",
      active: pathname?.startsWith("/employees") ?? false,
    },
  ];
}

function ProfileDropdown({
  avatarInitials,
  avatarLabel,
  loggingOut,
  onLogout,
  userEmail,
  userName,
}: {
  avatarInitials: string;
  avatarLabel: string;
  loggingOut: boolean;
  onLogout: () => void;
  userEmail?: string | null;
  userName?: string | null;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="rounded-full border border-border/60"
          aria-label={avatarLabel}
        >
          <Avatar className="h-9 w-9">
            <AvatarFallback>{avatarInitials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="space-y-1">
          <div className="font-medium text-foreground">
            {userName ?? "Account"}
          </div>
          <div className="text-xs font-normal text-muted-foreground">
            {userEmail ?? "Signed in"}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={onLogout}
          disabled={loggingOut}
          className="cursor-pointer"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {loggingOut ? "Logging out..." : "Logout"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function getInitials(value: string) {
  const parts = value
    .split(/[\s.@_-]+/)
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) {
    return "U";
  }

  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("");
}
