import Link from "next/link";

import { TinjauMark } from "@/components/tinjau-mark";

const LINKS = [
  { href: "/risk", label: "How it decides" },
  { href: "/compare", label: "Compare" },
  { href: "/proof", label: "Proof" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/developers", label: "Developers" },
  { href: "/demo", label: "Demo" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-edge bg-canvas text-ink">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_auto] lg:items-start lg:px-8">
        <div className="max-w-xl">
          <p className="flex items-center gap-2.5 font-display text-heading-sm font-semibold tracking-[-0.02em]">
            <TinjauMark className="h-7 w-7 shrink-0 text-signal" />
            Tinjau
          </p>
          <p className="mt-3 text-body-sm text-ink-muted">
            AI reads the evidence. Deterministic rules choose the state. The contract holds the
            limits.
          </p>
          <p className="mt-5 text-body-sm text-ink-faint">
            Hackathon MVP on X Layer Testnet, with a builder-controlled pool and replayed data. No
            production liquidity, no adoption, and no claim that it reduces LP loss. The
            measurement did not support one.
          </p>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 lg:justify-end">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex min-h-10 items-center font-body text-body-sm text-ink-secondary transition-colors duration-150 ease-tinjau hover:text-signal"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
