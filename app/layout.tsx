import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { MainNav } from "@/components/main-nav";
import { ConditionalMainNavWrapper } from "@/components/conditional-main-nav-wrapper";
import { Toaster } from "@/components/ui/sonner";
import { QueryProvider } from "@/components/query-provider";

const geistSans = localFont({
  src: "../public/fonts/geist/Geist-VariableFont_wght.ttf",
  variable: "--font-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "../public/fonts/geist-mono/GeistMono-VariableFont_wght.ttf",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Synoa Dental Lab CRM",
  description:
    "CAD workload, case tracking, and production dashboard for the dental lab.",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full",
        "antialiased",
        geistSans.variable,
        geistMono.variable,
        "font-sans",
      )}
    >
      <body className="flex h-screen flex-col overflow-hidden bg-background">
        <QueryProvider>
          <ConditionalMainNavWrapper>
            <MainNav />
          </ConditionalMainNavWrapper>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {children}
          </div>
          <Toaster richColors position="top-right" />
        </QueryProvider>
      </body>
    </html>
  );
}
