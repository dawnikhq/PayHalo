import type { Metadata } from "next";
import "@fontsource/instrument-serif/400.css";
import "@fontsource/instrument-serif/400-italic.css";
import "@fontsource-variable/inter";
import "./globals.css";
import { TopNav } from "@/components/TopNav";
import { DemoDock } from "@/components/DemoDock";

export const metadata: Metadata = {
  title: "Hack1 — A plan for your digital life",
  description:
    "The automated handover for the Dormant Billion. Decide where your digital wealth goes, name a trusted keyholder, and give your family a plan instead of a puzzle.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <TopNav />
        {children}
        <DemoDock />
      </body>
    </html>
  );
}
