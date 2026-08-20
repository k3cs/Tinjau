"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Manifest", shortLabel: "Manifest" },
  { href: "/holdings", label: "Holder Digest", shortLabel: "Digest" },
  { href: "/calendar", label: "Forward Calendar", shortLabel: "Calendar" },
  { href: "/scoreboard", label: "Scoreboard", shortLabel: "Board" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-dock-line/80 bg-dock/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2 sm:gap-3">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-[3px] border border-kraft/70 bg-kraft/10 text-[10px] font-mono text-kraft-light sm:h-8 sm:w-8 sm:text-[11px]"
          >
            AH
          </span>
          <span className="font-stencil text-base tracking-stencil text-bone sm:text-xl">Tinjau</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {NAV.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-[2px] px-3 py-2 font-mono text-[12px] uppercase tracking-[0.08em] transition-colors ${
                  active
                    ? "bg-kraft/15 text-kraft-light"
                    : "text-bone-muted hover:bg-dock-raised hover:text-bone"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 rounded-[2px] border border-hold/40 bg-hold-soft px-2 py-1.5 font-mono text-[9px] uppercase tracking-[0.08em] text-hold sm:gap-2 sm:px-2.5 sm:text-[10px] sm:tracking-[0.1em]">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-hold" aria-hidden />
          <span className="hidden sm:inline">In bond &mdash; X Layer testnet</span>
          <span className="sm:hidden">Testnet</span>
        </div>
      </div>
      <nav className="flex items-stretch border-t border-dock-line/80 sm:hidden">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 border-r border-dock-line/80 px-2 py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.04em] last:border-r-0 ${
                active ? "bg-kraft/15 text-kraft-light" : "text-bone-muted"
              }`}
            >
              {item.shortLabel}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
