"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

/**
 * Hides the CRM MainNav on the public landing page (/).
 * All other routes render the nav normally.
 */
export function ConditionalMainNavWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") return null;
  return <>{children}</>;
}
