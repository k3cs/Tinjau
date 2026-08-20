"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Risk State" },
  { href: "/compare", label: "Policy Compare" },
];

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-canvas">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-h-16 shrink-0 items-center gap-3 rounded-sm focus-visible:outline-offset-[-2px]"
          aria-label="Tinjau risk state"
        >
          <svg aria-hidden viewBox="0 0 32 32" className="h-8 w-8 text-signal" fill="none">
            <path d="M4 5h24v7H18v15h-7V12H4z" fill="currentColor" />
            <path d="M23 16h5M25.5 13.5v5" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span className="font-display text-xl font-semibold tracking-display text-ink">Tinjau</span>
        </Link>

        <nav className="order-3 flex w-full border-t border-edge sm:order-none sm:ml-4 sm:w-auto sm:border-0">
          {NAV.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-1 items-center justify-center border-b-2 px-4 font-data text-xs font-medium uppercase tracking-[0.06em] transition-colors sm:min-h-16 sm:flex-none ${
                  active
                    ? "border-signal text-ink"
                    : "border-transparent text-ink-muted hover:bg-canvas-soft hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex min-h-16 items-center gap-3 font-data text-[11px] uppercase tracking-[0.06em]">
          <span className="hidden text-ink-muted lg:inline">wNVDAx / USDG</span>
          <span className="h-4 w-px bg-edge" aria-hidden />
          <span className="flex items-center gap-2 text-ink-secondary">
            <span className="h-2 w-2 rounded-full bg-normal" aria-hidden />
            X Layer <span className="hidden sm:inline">· 196</span>
          </span>
        </div>
      </div>
    </header>
  );
}
