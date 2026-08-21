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

export const metadata: Metadata = {
  metadataBase: new URL("https://tinjau.xyz"),
  title: "Tinjau — Bounded LP Risk Autopilot",
  description:
    "Source-grounded evidence, independent market confirmation, and bounded protection for tokenized-stock liquidity on X Layer.",
  applicationName: "Tinjau",
  openGraph: {
    title: "Tinjau — Bounded LP Risk Autopilot",
    description:
      "Tokenized-stock liquidity should not react blind. Inspect the evidence, policy boundary, and bounded action path.",
    siteName: "Tinjau",
    type: "website",
    url: "/",
  },
  twitter: {
    card: "summary",
    title: "Tinjau — Bounded LP Risk Autopilot",
    description:
      "Source-grounded risk state and bounded protection for tokenized-stock liquidity on X Layer.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${data.variable}`}>
      <body className="bg-paper font-body text-coal antialiased">
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
