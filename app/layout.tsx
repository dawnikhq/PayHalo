import type { Metadata } from "next";
import localFont from "next/font/local";
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "./globals.css";

/* Instrument Serif, vendored (SIL Open Font License, see app/fonts/OFL-InstrumentSerif.txt).
   Headlines only: it is the difference between a product page and a brochure. */
const serif = localFont({
  src: [
    { path: "./fonts/InstrumentSerif-Regular.ttf", weight: "400", style: "normal" },
    { path: "./fonts/InstrumentSerif-Italic.ttf", weight: "400", style: "italic" },
  ],
  variable: "--font-serif",
  display: "swap",
  fallback: ["Georgia", "Times New Roman", "serif"],
});

export const metadata: Metadata = {
  title: "PayHalo — Your legacy, considered.",
  description:
    "PayHalo is the calm handover for your digital estate. Decide where your digital wealth goes, name a trusted keyholder, and give your family a plan instead of a puzzle.",
  applicationName: "PayHalo",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={serif.variable}>
      <body className="antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-[var(--color-forest)] focus:px-4 focus:py-2 focus:text-white"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
