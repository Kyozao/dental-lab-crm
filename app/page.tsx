import type { Metadata } from "next";
import localFont from "next/font/local";
import { VelaLanding } from "@/features/marketing/components/vela-landing";

const spaceGrotesk = localFont({
  src: "../public/fonts/geist/Geist-VariableFont_wght.ttf",
  variable: "--font-space-grotesk",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vela Dental Design — Designs that labs produce. Perfectly.",
  description:
    "Precision digital prosthetic design for dental labs and clinics. Zero rework. Every time.",
};

export default function HomePage() {
  return (
    <div className={spaceGrotesk.variable}>
      <VelaLanding />
    </div>
  );
}
