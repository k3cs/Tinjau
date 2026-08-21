import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/reveal";
import { PRODUCT_CAPABILITIES } from "@/lib/product/capabilities";
import { ROADMAP, ROADMAP_HORIZON_LABEL, type RoadmapHorizon } from "@/lib/product/roadmap";

import { CapabilityCard } from "./_components/capability-card";

export const metadata: Metadata = {
  title: "What exists, what doesn't · Tinjau",
  description:
    "A line between the parts of Tinjau that run today and the parts that are only planned. Roadmap items are labelled roadmap and claim nothing.",
};

const HORIZONS: RoadmapHorizon[] = ["NEXT", "LATER", "REQUIRES_ACCESS"];

const BUILT = PRODUCT_CAPABILITIES.filter((c) => c.maturity === "IMPLEMENTED");
const PARTIAL = PRODUCT_CAPABILITIES.filter(
  (c) => c.maturity === "HISTORICAL" || c.maturity === "PENDING",
);

export default function RoadmapPage() {
  return (
    <div className="bg-paper text-coal">
      <section className="mx-auto max-w-[1440px] px-4 pb-16 pt-14 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <p className="data-label text-coal-faint">Roadmap</p>
          <h1 className="mt-4 font-display text-section-sm text-coal lg:text-section-lg">
            A line down the middle of the product.
          </h1>
          <p className="mt-6 max-w-3xl text-body-md text-coal-soft">
            Everything on the left runs today and has evidence behind it. Everything on the right
            is an intention. Nothing on the right is described in the present tense, and none of it
            is part of what this submission claims.
          </p>
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-baseline gap-x-4">
            <h2 className="font-display text-heading-lg text-coal">Runs today</h2>
            <p className="font-data text-[12px] text-coal-faint">
              {BUILT.length} capabilities · each with a test or an artifact
            </p>
          </div>

          <div className="mt-8 grid gap-px border border-edge-light bg-edge-light sm:grid-cols-2 lg:grid-cols-3">
            {BUILT.map((capability, index) => (
              <Reveal key={capability.id} delay={index * 0.03} className="bg-paper-bright">
                <CapabilityCard capability={capability} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <h2 className="font-display text-heading-lg text-coal">Exists, but not finished</h2>
          <p className="mt-2 max-w-3xl text-body-md text-coal-muted">
            Historical deployments and unintegrated paths. Real, and not yet part of the final
            loop.
          </p>

          <div className="mt-8 grid gap-px border border-edge-light bg-edge-light sm:grid-cols-2">
            {PARTIAL.map((capability, index) => (
              <Reveal key={capability.id} delay={index * 0.03} className="bg-paper-bright">
                <CapabilityCard capability={capability} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-coal text-paper-bright">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-baseline gap-x-4">
            <h2 className="font-display text-heading-lg">Not built</h2>
            <span className="data-label rounded border border-signal px-2 py-1 text-signal">
              Roadmap · nothing here is shipped
            </span>
          </div>
          <p className="mt-3 max-w-3xl text-body-md text-ink-muted">
            No dates, no progress bars. Each item names the thing that would have to become true
            before it could start, which is more useful than a quarter.
          </p>

          <div className="mt-10 space-y-12">
            {HORIZONS.map((horizon) => {
              const items = ROADMAP.filter((item) => item.horizon === horizon);
              if (items.length === 0) return null;
              return (
                <div key={horizon}>
                  <h3 className="data-label border-b border-edge pb-3 text-signal">
                    {ROADMAP_HORIZON_LABEL[horizon]}
                  </h3>
                  <ul className="mt-6 grid gap-8 lg:grid-cols-2">
                    {items.map((item, index) => (
                      // Reveal sits inside the <li>, never between <ul> and
                      // <li>. An intervening <div> breaks the list semantics.
                      <li key={item.id} className="border-l-2 border-edge-strong pl-5">
                        <Reveal delay={index * 0.04}>
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-display text-heading-sm text-ink">
                              {item.title}
                            </h4>
                            <span className="data-label rounded border border-maturity-roadmap px-1.5 py-0.5 text-ink-faint">
                              Roadmap
                            </span>
                          </div>
                          <p className="mt-2 text-body-sm text-ink-secondary">{item.intent}</p>
                          <p className="mt-3 text-body-sm text-ink-muted">
                            <span className="text-watch-soft">Blocked by: </span>
                            {item.blockedBy}
                          </p>
                        </Reveal>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          <p className="mt-14 border-t border-edge pt-6 text-body-sm text-ink-muted">
            The evidence for the left-hand side is on{" "}
            <Link href="/proof" className="text-signal underline">
              Proof
            </Link>
            , and the measured comparison (including the part that did not go our way) is on{" "}
            <Link href="/compare" className="text-signal underline">
              Compare
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
