"use client";

import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { useState } from "react";

import { Segmented } from "@/components/segmented";
import { SCENARIOS, getScenario } from "@/lib/handoff/scenarios";
import { HANDOFF_DIR, HANDOFF_GENERATED } from "@/lib/handoff/artifacts";
import { scenarioTransition } from "@/lib/ui/motion";

import { ActionPanel } from "./action-panel";
import { ConstructedCaveat } from "./constructed-caveat";
import { EvidencePanel } from "./evidence-panel";
import { MarketPanel } from "./market-panel";
import { ReasonLedger } from "./reason-ledger";
import { StateHeader } from "./state-header";
import { TrustBoundary } from "./trust-boundary";

const OPTIONS = SCENARIOS.map((scenario) => ({
  value: scenario.slug,
  label: scenario.tab,
  hint: `${scenario.record.state} · ${scenario.provenance.marketLeg} market`,
}));

/**
 * One screen that answers both of T6.1's questions: why the state changed, and
 * what the AI is not allowed to do.
 *
 * Everything is on this page at once rather than behind steps, because the
 * acceptance test is a judge explaining it from a single screen. The scenario
 * switch is the only mode, and the two scenarios are deliberately a `WATCH`
 * that refused to act and a `PROTECT` that only exists on constructed inputs.
 */
export function RiskConsole() {
  const [slug, setSlug] = useState(SCENARIOS[0].slug);
  const scenario = getScenario(slug);
  const reduced = useReducedMotion();

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="demo-shell">
        <div className="mx-auto max-w-[1440px] px-4 py-12 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="data-label text-signal">Risk state</p>
            <h1 className="mt-3 font-display text-section-sm text-ink lg:text-section-lg">
              Read the decision, not the dashboard.
            </h1>
            <p className="mt-4 text-body-md text-ink-muted">
              Two frozen scenarios, end to end. Every value below is read from the published
              backend handoff, including the ones that do not flatter us.
            </p>
          </div>

          <div className="mt-8 max-w-xl">
            <Segmented
              options={OPTIONS}
              value={slug}
              onChange={(next) => setSlug(next as typeof slug)}
              onDark
              ariaLabel="Choose a scenario"
            />
            <p className="mt-3 text-body-sm text-ink-faint">{scenario.purpose}</p>
          </div>

          <m.div
            key={slug}
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={reduced ? { duration: 0 } : scenarioTransition}
            className="mt-10 space-y-10"
          >
            <StateHeader scenario={scenario} />

            {scenario.caveat ? <ConstructedCaveat caveat={scenario.caveat} /> : null}

            <div className="grid gap-10 lg:grid-cols-2">
              <ReasonLedger record={scenario.record} />
              <div className="space-y-10">
                <MarketPanel scenario={scenario} />
                <ActionPanel scenario={scenario} />
              </div>
            </div>

            <EvidencePanel scenario={scenario} />

            <TrustBoundary scenario={scenario} />

            <section
              aria-labelledby="limitations"
              className="rounded-xl border border-edge bg-canvas-sunken p-6"
            >
              <h2 id="limitations" className="font-display text-heading-sm text-ink">
                What this scenario does not show
              </h2>
              <ul className="mt-4 space-y-3">
                {scenario.limitations.map((limitation) => (
                  <li key={limitation} className="flex gap-3 text-body-sm text-ink-muted">
                    <span aria-hidden className="mt-2.5 h-px w-3 shrink-0 bg-watch" />
                    {limitation}
                  </li>
                ))}
              </ul>
            </section>

            <p className="border-t border-edge pt-6 font-data text-[11px] text-ink-faint">
              Source: {HANDOFF_DIR} · regenerated {HANDOFF_GENERATED} · validated against the
              published schemas.
            </p>
          </m.div>
        </div>
      </div>
    </LazyMotion>
  );
}
