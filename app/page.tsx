import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import { VelaLanding } from "@/components/vela-landing";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500"],
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
