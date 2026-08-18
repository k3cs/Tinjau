import type { Metadata } from "next";
import { Allerta_Stencil, Archivo, Roboto_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DirectionContract } from "@/components/direction-contract";

const stencil = Allerta_Stencil({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-stencil",
  display: "swap",
});

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const robotoMono = Roboto_Mono({
  subsets: ["latin"],
  variable: "--font-tracking-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AFTERHOURS — a customs house for corporate events",
  description:
    "AFTERHOURS holds every SEC filing on a tokenised US equity as bonded cargo — inspected by three independent parses, stamped with an agreement level, and released on-chain with a disputable bond. No wallet, no gas, just the record.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${stencil.variable} ${archivo.variable} ${robotoMono.variable}`}>
      <body className="font-body bg-dock text-bone antialiased">
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
