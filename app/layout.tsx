import type { Metadata, Viewport } from "next";
import "@fontsource-variable/plus-jakarta-sans";
import "./globals.css";

/**
 * What the link looks like when it is pasted somewhere: the mark as the tab
 * icon, the brand line as the title, and the dark-green card as the preview.
 */
const SITE = "https://hack1-weld.vercel.app";
const TITLE = "PayHalo — Your Wealth, left in good hands.";
const DESCRIPTION =
  "PayHalo is a digital inheritance platform. Record what you own, decide who inherits it, appoint a Trusted Key, and leave instructions your family can follow.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: "%s — PayHalo" },
  description: DESCRIPTION,
  applicationName: "PayHalo",
  authors: [{ name: "PayHalo" }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "PayHalo",
    title: TITLE,
    description: DESCRIPTION,
    url: "/",
    images: [
      { url: "/brand/payhalo-og.png", width: 1200, height: 630, alt: "PayHalo — Your Wealth, left in good hands." },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/brand/payhalo-og.png"],
  },
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/icon.png", sizes: "512x512" }],
    shortcut: ["/icon.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0B3D2E",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
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
