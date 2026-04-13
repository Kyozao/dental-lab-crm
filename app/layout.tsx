import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ConditionalMainNav } from "@/components/conditional-main-nav";
import { Toaster } from "@/components/ui/sonner";
import { PwaBootstrap } from "@/components/pwa-bootstrap";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  weight: ["400", "500", "600"],
});

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
        inter.variable,
        spaceGrotesk.variable,
      )}
    >
      <body className="min-h-screen flex flex-col bg-background">
        <PwaBootstrap />
        <ConditionalMainNav />
        <div className="flex-1">{children}</div>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
