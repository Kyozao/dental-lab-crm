import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { cn } from "@/lib/utils";
import { MainNav } from "@/components/main-nav";
import { ConditionalMainNavWrapper } from "@/components/conditional-main-nav-wrapper";
import { Toaster } from "@/components/ui/sonner";

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
      <body className="min-h-screen flex flex-col bg-background">
        <ConditionalMainNavWrapper>
          <MainNav />
        </ConditionalMainNavWrapper>
        <div className="flex-1">{children}</div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
