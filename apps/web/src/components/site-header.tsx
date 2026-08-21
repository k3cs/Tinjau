"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";

import { TinjauMark } from "@/components/tinjau-mark";

/**
 * `/risk` is labelled "How it decides", not "Risk state".
 *
 * "Risk state" named the data on the page rather than the reason to open it, so
 * a first-time visitor read it as a status widget. The page is really the
 * explanation of the mechanism, worked through two frozen records: the evidence,
 * the market check, the rule that fired, and the bound the contract held. "How
 * it works" would say that too, but "decides" names the specific thing this
 * product does, and it stays clear of `/demo`, which is the guided run rather
 * than the explanation. The URL is unchanged.
 */
const NAV = [
  { href: "/risk", label: "How it decides" },
  { href: "/compare", label: "Compare" },
  { href: "/proof", label: "Proof" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/developers", label: "Developers" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const reduced = useReducedMotion();

  return (
    <LazyMotion features={domAnimation} strict>
      <header className="sticky top-0 z-40 border-b border-edge bg-canvas/95 text-ink backdrop-blur">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex min-h-16 shrink-0 items-center gap-2.5 rounded"
            aria-label="Tinjau home"
          >
            <TinjauMark className="h-7 w-7 text-signal" />
            <span className="font-display text-heading-sm font-semibold tracking-[-0.02em]">
              Tinjau
            </span>
          </Link>

          <nav
            className="order-3 flex w-full overflow-x-auto border-t border-edge sm:order-none sm:ml-4 sm:w-auto sm:border-0"
            aria-label="Primary"
          >
            {NAV.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`relative flex min-h-12 flex-1 items-center justify-center whitespace-nowrap px-3.5 font-body text-body-sm font-medium transition-colors duration-150 ease-tinjau sm:min-h-16 sm:flex-none ${
                    active ? "text-ink" : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {item.label}
                  {active ? (
                    <m.span
                      layoutId="nav-underline"
                      aria-hidden
                      className="absolute inset-x-3 bottom-0 h-0.5 bg-signal"
                      transition={
                        reduced ? { duration: 0 } : { duration: 0.28, ease: [0.22, 1, 0.36, 1] }
                      }
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <Link
            href="/demo"
            aria-current={pathname.startsWith("/demo") ? "page" : undefined}
            className="ml-auto inline-flex min-h-11 items-center justify-center rounded-pill bg-signal px-5 font-body text-body-sm font-medium text-black transition-colors duration-150 ease-tinjau hover:bg-signal-soft active:translate-y-px"
          >
            Walk through it
          </Link>
        </div>
      </header>
    </LazyMotion>
  );
}
