import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DirectionContract } from "@/components/direction-contract";

const display = Space_Grotesk({
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

export const metadata: Metadata = {
  metadataBase: new URL("https://tinjau.xyz"),
  title: "Tinjau — LP Risk Autopilot on X Layer",
  description:
    "Source-grounded market discontinuity protection for tokenized-stock liquidity: evidence, independent confirmation, bounded action, and deterministic recovery.",
  applicationName: "Tinjau",
  openGraph: {
    title: "Tinjau — LP Risk Autopilot on X Layer",
    description:
      "Evidence, independent market confirmation, bounded LP protection, and deterministic recovery.",
    siteName: "Tinjau",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "Tinjau — LP Risk Autopilot on X Layer",
    description:
      "Source-grounded risk state and bounded protection for tokenized-stock liquidity.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${data.variable}`}>
      <body className="bg-canvas font-body text-ink antialiased">
        <DirectionContract />
        <div className="flex min-h-screen flex-col">
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
