"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

/**
 * Hides the CRM MainNav on public and setup pages.
 * All other routes render the nav normally.
 */
export function ConditionalMainNavWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (
    pathname === "/" ||
    pathname === "/login" ||
    pathname.startsWith("/onboarding")
  ) {
    return null;
  }

  return <>{children}</>;
}
