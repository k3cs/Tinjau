"use client";

import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { useState } from "react";

import { Segmented } from "@/components/segmented";
import {
  BASIS_LABEL,
  BASIS_ORDER,
  COMPARISON_DOC,
  DRAWDOWN_GRID,
  K_GRID,
  SCENARIO_ROWS,
  cellPair,
  formatUsd,
  type ComparisonCell,
} from "@/lib/handoff/comparison";
import { scenarioTransition } from "@/lib/ui/motion";

const VERDICT_LABEL: Record<ComparisonCell["vsVolatilityOnly"], string> = {
  TINJAU_BEATS: "Tinjau higher",
  TINJAU_LOSES: "Tinjau lower",
  TINJAU_TIES: "Identical",
  NOT_COMPARABLE: "Not comparable",
};

const VERDICT_TONE: Record<ComparisonCell["vsVolatilityOnly"], string> = {
  TINJAU_BEATS: "text-normal-soft",
  TINJAU_LOSES: "text-protect-soft",
  TINJAU_TIES: "text-ink-muted",
  NOT_COMPARABLE: "text-ink-faint",
};

const SCENARIO_LABEL: Record<string, string> = {
  "A-rumor-watch": "A · Rumour",
  "B-confirmed-protect": "B · Confirmed event",
  "C-two-origins-hard-case": "C · Two origins",
  "D-neutral-normal": "D · Neutral control",
};

/**
 * The grid, with both metric bases always adjacent.
 *
 * The interesting thing here is not any single number. It is that the two
 * columns disagree about the direction on the same trades. So the layout puts
 * them next to each other and marks the disagreement, rather than offering a
 * basis toggle that would let a reader see only one.
 */
export function ComparisonGrid() {
  const [scenarioId, setScenarioId] = useState(SCENARIO_ROWS[3]?.scenarioId ?? SCENARIO_ROWS[0].scenarioId);
  const [k, setK] = useState(K_GRID[0]);
  const [bps, setBps] = useState(DRAWDOWN_GRID[1] ?? DRAWDOWN_GRID[0]);
  const reduced = useReducedMotion();

  const pair = cellPair(scenarioId, k, bps);
  const scenarioMeta = SCENARIO_ROWS.find((row) => row.scenarioId === scenarioId);

  return (
    <LazyMotion features={domAnimation} strict>
      <section aria-labelledby="comparison-grid" className="scroll-mt-24" id="grid">
        <h2 id="comparison-grid" className="font-display text-heading-lg text-ink">
          Every cell, both bases
        </h2>
        <p className="mt-2 max-w-[56ch] text-body-md text-ink-muted">
          Both trigger settings are reported across the whole grid, so neither could be chosen
          after the results were in.
        </p>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <Control label="Scenario">
            <Segmented
              ariaLabel="Choose a scenario"
              value={scenarioId}
              onChange={setScenarioId}
              options={SCENARIO_ROWS.map((row) => ({
                value: row.scenarioId,
                label: SCENARIO_LABEL[row.scenarioId] ?? row.scenarioId,
              }))}
            />
          </Control>
          <Control label="Volatility trigger k">
            <Segmented
              ariaLabel="Choose the volatility trigger multiplier"
              value={String(k)}
              onChange={(next) => setK(Number(next))}
              options={K_GRID.map((value) => ({ value: String(value), label: `k = ${value}` }))}
            />
          </Control>
          <Control label="Tinjau drawdown floor">
            <Segmented
              ariaLabel="Choose the Tinjau drawdown floor"
              value={String(bps)}
              onChange={(next) => setBps(Number(next))}
              options={DRAWDOWN_GRID.map((value) => ({
                value: String(value),
                label: `${value} bps`,
              }))}
            />
          </Control>
        </div>

        {scenarioMeta ? (
          <p className="mt-5 text-body-sm text-ink-muted">
            <span className="font-medium text-ink">{scenarioMeta.role.replaceAll("_", " ")}.</span>{" "}
            Pre-registered outcome: {scenarioMeta.preRegisteredState}.
          </p>
        ) : null}

        <m.div
          key={`${scenarioId}-${k}-${bps}`}
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={reduced ? { duration: 0 } : scenarioTransition}
          className="mt-6 overflow-x-auto"
          // The table scrolls sideways on narrow screens, so the container has
          // to be reachable by keyboard, otherwise the right-hand columns are
          // only available to a pointer.
          tabIndex={0}
          role="region"
          aria-label="Comparison results; scroll horizontally on narrow screens"
        >
          <table className="w-full min-w-[44rem] border-collapse text-left">
            <caption className="sr-only">
              LP markout at 3600 seconds for each policy, under both metric bases
            </caption>
            <thead>
              <tr className="border-b border-edge">
                <th scope="col" className="data-label py-3 pr-4 text-ink-muted">
                  Metric basis
                </th>
                <th scope="col" className="data-label py-3 pr-4 text-ink-muted">
                  Static
                </th>
                <th scope="col" className="data-label py-3 pr-4 text-ink-muted">
                  Volatility-only
                </th>
                <th scope="col" className="data-label py-3 pr-4 text-ink-muted">
                  Tinjau
                </th>
                <th scope="col" className="data-label py-3 text-ink-muted">
                  Tinjau vs volatility-only
                </th>
              </tr>
            </thead>
            <tbody>
              {BASIS_ORDER.map((basis) => {
                const cell = pair.byBasis[basis];
                if (!cell) return null;
                return (
                  <tr key={basis} className="border-b border-edge align-top">
                    <th scope="row" className="py-4 pr-4">
                      <span className="block font-body text-body-sm font-medium text-ink">
                        {BASIS_LABEL[basis]}
                      </span>
                      <span className="mt-1 block max-w-[16rem] text-body-xs text-ink-faint">
                        {basis === "PRE_REGISTERED"
                          ? "Frozen before results. The only basis the claim gate reads."
                          : "Written after results were seen. Excluded from the claim gate."}
                      </span>
                    </th>
                    <Cell value={cell.staticUsd} />
                    <Cell value={cell.volatilityOnlyUsd} />
                    <Cell value={cell.tinjauUsd} />
                    <td className="py-4">
                      <span
                        className={`font-data text-[12px] ${VERDICT_TONE[cell.vsVolatilityOnly]}`}
                      >
                        {VERDICT_LABEL[cell.vsVolatilityOnly]}
                      </span>
                      <span className="mt-1 block font-data text-[11px] text-ink-faint">
                        vs static: {VERDICT_LABEL[cell.vsStatic]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </m.div>

        {pair.signFlips ? (
          <p className="mt-5 rounded-xl border-2 border-watch bg-watch/[0.06] p-5 text-body-sm text-ink">
            <span className="font-medium">These two rows disagree about the direction.</span> One
            metric penalises raising a fee, the other rewards it. The truth sits between them and
            the gap crosses zero.
          </p>
        ) : null}

        {!pair.comparable ? (
          <p className="mt-5 rounded-xl border border-edge bg-surface p-5 text-body-sm text-ink-muted">
            {pair.byBasis.PRE_REGISTERED?.note ??
              "This scenario carries no economic row. Reported as unavailable, never imputed."}
          </p>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {COMPARISON_DOC.method.metricBases.map((basis) => (
            <div key={basis.id} className="panel p-5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-body text-body-sm font-medium text-ink">
                  {BASIS_LABEL[basis.id]}
                </p>
                {basis.governsClaimGate ? (
                  <span className="data-label rounded border border-edge px-1.5 py-0.5 text-ink">
                    Governs the claim gate
                  </span>
                ) : (
                  <span className="data-label rounded border border-watch-soft px-1.5 py-0.5 text-watch-soft">
                    Post-hoc · excluded
                  </span>
                )}
              </div>
              <p className="mt-3 text-body-sm text-ink-muted">{basis.knownDefect}</p>
            </div>
          ))}
        </div>
      </section>
    </LazyMotion>
  );
}

function Cell({ value }: { value: number | null }) {
  return (
    <td className="py-4 pr-4 font-data text-[13px] text-ink tabular">
      {value === null ? (
        <span className="text-ink-faint">No economic row</span>
      ) : (
        formatUsd(value)
      )}
    </td>
  );
}

function Control({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="data-label mb-2 text-ink-faint">{label}</p>
      {children}
    </div>
  );
}
