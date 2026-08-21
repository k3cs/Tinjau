"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/#product", label: "Product" },
  { href: "/#system", label: "System" },
  { href: "/developers", label: "Developers" },
  { href: "/proof", label: "Proof" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const onDemo = pathname.startsWith("/demo");

  return (
    <header
      className={`sticky top-0 z-40 border-b ${
        onDemo ? "border-edge bg-canvas text-ink" : "border-black/20 bg-paper text-coal"
      }`}
    >
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex min-h-16 shrink-0 items-center gap-3 rounded-sm focus-visible:outline-offset-[-2px]"
          aria-label="Tinjau home"
        >
          <svg aria-hidden viewBox="0 0 32 32" className="h-8 w-8 text-signal" fill="none">
            <path d="M4 5h24v7H18v15h-7V12H4z" fill="currentColor" />
            <path d="M23 16h5M25.5 13.5v5" stroke="currentColor" strokeWidth="2" />
          </svg>
          <span className="font-display text-xl font-semibold tracking-display">Tinjau</span>
        </Link>

        <nav
          className={`order-3 flex w-full border-t sm:order-none sm:ml-4 sm:w-auto sm:border-0 ${
            onDemo ? "border-edge" : "border-black/20"
          }`}
          aria-label="Primary navigation"
        >
          {NAV.map((item) => {
            const active = !item.href.startsWith("/#") && pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 flex-1 items-center justify-center border-b-2 border-transparent px-3 font-data text-[10px] font-medium uppercase tracking-[0.06em] transition-colors duration-100 ease-tinjau sm:min-h-16 sm:flex-none sm:px-4 ${
                  onDemo
                    ? "text-ink-muted hover:border-edge-strong hover:text-ink"
                    : "text-coal-muted hover:border-black hover:text-coal"
                } ${active ? (onDemo ? "border-signal text-ink" : "border-black text-coal") : ""}`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <Link
          href="/demo"
          aria-current={onDemo ? "page" : undefined}
          className={`ml-auto inline-flex min-h-11 items-center justify-center border px-4 font-data text-[10px] font-semibold uppercase tracking-[0.06em] transition-colors duration-100 ease-tinjau active:translate-y-px ${
            onDemo
              ? "border-signal bg-signal text-black hover:bg-white"
              : "border-black bg-black text-white hover:bg-signal hover:text-black"
          }`}
        >
          Start demo
        </Link>
      </div>
    </header>
  );
}
