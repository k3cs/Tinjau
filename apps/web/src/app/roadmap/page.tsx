import type { Metadata } from "next";
import Link from "next/link";

import { Reveal } from "@/components/reveal";
import { WiringGapDiagram } from "@/components/diagrams/wiring-gap-diagram";
import { PRODUCT_CAPABILITIES } from "@/lib/product/capabilities";
import { ROADMAP, ROADMAP_HORIZON_LABEL, type RoadmapHorizon } from "@/lib/product/roadmap";

import { CapabilityCard } from "./_components/capability-card";
import { RoadmapRail } from "./_components/roadmap-rail";

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
    <div className="bg-canvas text-ink">
      <section className="mx-auto max-w-[1440px] px-4 pb-16 pt-14 sm:px-6 lg:px-8">
        <div className="max-w-4xl">
          <p className="data-label text-ink-faint">Roadmap</p>
          <h1 className="mt-4 font-display text-section-sm text-ink lg:text-section-lg">
            A line down the middle of the product.
          </h1>
          <p className="mt-5 max-w-[50ch] text-body-md text-ink-secondary">
            The top half runs today and has evidence behind it. The bottom half is an intention,
            written in the future tense, and claims nothing.
          </p>
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-baseline gap-x-4">
            <h2 className="font-display text-heading-lg text-ink">Runs today</h2>
            <p className="font-data text-[12px] text-ink-faint">
              {BUILT.length} capabilities · each with a test or an artifact
            </p>
          </div>

          <div className="mt-8 grid gap-px border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-3">
            {BUILT.map((capability, index) => (
              <Reveal key={capability.id} delay={index * 0.03} className="bg-canvas-sunken">
                <CapabilityCard capability={capability} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-heading-lg text-ink">Built, not plugged in</h2>
            <p className="mt-2 max-w-[52ch] text-body-md text-ink-muted">
              These pieces are finished and they work. Nothing joins them to the loop yet, so
              the loop runs without them.
            </p>
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_0.65fr] lg:items-start">
            <WiringGapDiagram />
            <div className="grid gap-px border border-edge bg-edge">
              {PARTIAL.map((capability, index) => (
                <Reveal key={capability.id} delay={index * 0.03} className="bg-canvas-sunken">
                  <CapabilityCard capability={capability} />
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-rule bg-canvas-sunken text-ink">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-baseline gap-x-4">
            <h2 className="font-display text-heading-lg">Not built</h2>
            <span className="data-label rounded border border-signal px-2 py-1 text-signal">
              Roadmap · nothing here is shipped
            </span>
          </div>
          <p className="mt-3 max-w-[54ch] text-body-md text-ink-muted">
            No dates and no progress bars, because nothing here is part-way through. The rail
            below is gated by conditions instead: each gate names what has to become true before
            anything behind it can move.
          </p>

          <RoadmapRail builtCount={BUILT.length} />

          <p className="mt-14 border-t border-edge pt-6 text-body-sm text-ink-muted">
            The evidence for the top half is on{" "}
            <Link href="/proof" className="text-signal underline">
              Proof
            </Link>
            , and the measured comparison, including the part that did not go our way, is on{" "}
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
