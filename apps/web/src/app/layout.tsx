import type { Metadata } from "next";
import { Inter, Inter_Tight, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DirectionContract } from "@/components/direction-contract";

const display = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const data = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-data",
  display: "swap",
});

const TITLE = "Tinjau · bounded LP risk autopilot";
const DESCRIPTION =
  "Tinjau reads the filing behind a price move, checks the X Layer pool independently, and lets the contract decide what the pool may do. Hackathon MVP on testnet, built on replayed data.";

export const metadata: Metadata = {
  metadataBase: new URL("https://tinjau.xyz"),
  title: { default: TITLE, template: "%s" },
  description: DESCRIPTION,
  applicationName: "Tinjau",
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: "Tinjau",
    type: "website",
    url: "/",
  },
  // `summary_large_image` because `twitter-image.png` is a 1200x630 card. Left
  // as `summary` it would be cropped to a square and lose the wordmark.
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${data.variable}`}>
      <body className="bg-canvas font-body text-ink antialiased">
        <DirectionContract />
        <a href="#main-content" className="sr-only fixed left-4 top-4 z-50 border border-edge bg-signal px-4 py-3 font-data text-xs font-semibold uppercase text-black focus:not-sr-only">
          Skip to main content
        </a>
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main id="main-content" tabIndex={-1} className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
