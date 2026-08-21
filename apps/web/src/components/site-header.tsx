"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";

import { TinjauMark } from "@/components/tinjau-mark";

const NAV = [
  { href: "/risk", label: "Risk state" },
  { href: "/compare", label: "Compare" },
  { href: "/proof", label: "Proof" },
  { href: "/roadmap", label: "Roadmap" },
  { href: "/developers", label: "Developers" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const reduced = useReducedMotion();
  const onDark = pathname.startsWith("/demo") || pathname.startsWith("/risk");

  return (
    <LazyMotion features={domAnimation} strict>
      <header
        className={`sticky top-0 z-40 border-b ${
          onDark ? "border-edge bg-canvas text-ink" : "border-edge-light bg-paper text-coal"
        }`}
      >
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-x-4 px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="flex min-h-16 shrink-0 items-center gap-2.5 rounded"
            aria-label="Tinjau home"
          >
            {/*
              Lime on carbon, deep green on paper. The lime does not pass
              contrast on a light surface, so the light route gets the OKX
              light-mode brand token rather than a dimmed lime.
            */}
            <TinjauMark className={`h-7 w-7 ${onDark ? "text-signal" : "text-signal-deep"}`} />
            <span className="font-display text-heading-sm font-semibold tracking-[-0.02em]">
              Tinjau
            </span>
          </Link>

          <nav
            className={`order-3 flex w-full overflow-x-auto border-t sm:order-none sm:ml-4 sm:w-auto sm:border-0 ${
              onDark ? "border-edge" : "border-edge-light"
            }`}
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
                    active
                      ? onDark
                        ? "text-ink"
                        : "text-coal"
                      : onDark
                        ? "text-ink-muted hover:text-ink"
                        : "text-coal-muted hover:text-coal"
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
            className={`ml-auto inline-flex min-h-11 items-center justify-center rounded-pill px-5 font-body text-body-sm font-medium transition-colors duration-150 ease-tinjau active:translate-y-px ${
              onDark
                ? "bg-signal text-black hover:bg-signal-soft"
                : "bg-coal text-paper-bright hover:bg-signal hover:text-black"
            }`}
          >
            Walk through it
          </Link>
        </div>
      </header>
    </LazyMotion>
  );
}
