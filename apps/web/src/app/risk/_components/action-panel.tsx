"use client";

import { LazyMotion, domAnimation } from "motion/react";

import { FeeLifecycleDiagram } from "@/components/diagrams/fee-lifecycle-diagram";
import { HexValue } from "@/components/hex-value";
import { formatFee } from "@/lib/risk/format";
import type { ScenarioView } from "@/lib/handoff/scenarios";

const EXPLORER = "https://www.oklink.com/x-layer-testnet/tx/";

/**
 * What the pool actually did, and how it came back.
 *
 * The recovery figures are measured transactions, but under a 60x-compressed
 * demo envelope. X Layer Testnet has no `evm_increaseTime`, so the production
 * envelope's six-hour recovery cannot be watched live. The compression is
 * stated next to the numbers rather than in a footnote, because a 300 s decay
 * presented without it reads as a product characteristic.
 */
export function ActionPanel({ scenario }: { scenario: ScenarioView }) {
  const { record, recovery, action, onChain, caveat } = scenario;

  return (
    <LazyMotion features={domAnimation} strict>
      <section aria-labelledby="action-panel">
        <h2 id="action-panel" className="font-display text-heading-sm text-ink">
          Bounded action
        </h2>
        <p className="mt-1 text-body-sm text-ink-muted">
          The only thing it can do is raise one fee, inside limits the contract holds.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Authorised" tone={record.action.authorized ? "text-normal" : "text-watch"}>
            {record.action.authorized ? "Yes" : "No"}
          </Stat>
          <Stat label="Status">{record.action.status}</Stat>
          <Stat label="Base fee">{formatFee(record.action.baseFee)}</Stat>
          <Stat label="Ceiling">{formatFee(record.action.maxFee)}</Stat>
        </div>

        {recovery && onChain ? (
          <div className="mt-6">
            <FeeLifecycleDiagram
              envelope={onChain.envelope}
              measured={recovery.measured}
              caveat={
                caveat
                  ? `Three real transactions on a builder-controlled testnet pool with CONSTRUCTED market inputs. The canonical replay of this event is ${caveat.canonicalReplayState}.`
                  : "Three real transactions on a builder-controlled testnet pool."
              }
            />
            <div className="mt-4 rounded-xl border border-edge bg-canvas-sunken p-5">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-body text-body-sm font-medium text-ink">
                  The three transactions
                </p>
                <p className="data-label text-watch-soft">60x compressed demo envelope</p>
              </div>
              <p className="mt-2 text-body-sm text-ink-muted">
                The production envelope recovers over 21,600 s. That curve was not watched live:
                the testnet has no way to advance its clock.
              </p>
              <ul className="mt-4 space-y-2">
                {recovery.measured.map((step) => (
                  <li key={step.txHash} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span className="w-24 font-body text-body-sm text-ink-secondary">
                      {step.label}
                    </span>
                    <span className="font-data text-[12px] tabular text-ink">
                      {formatFee(String(step.appliedFee))}
                    </span>
                    <HexValue value={step.txHash} href={`${EXPLORER}${step.txHash}`} label="tx" />
                  </li>
                ))}
              </ul>
              <p className="mt-4 border-t border-edge pt-4 text-body-sm text-ink-muted">
                {recovery.previewIsUpperBound}
              </p>
              <p className="mt-3 text-body-sm text-ink-muted">{recovery.storedVsEffective}</p>
            </div>
          </div>
        ) : (
          <p className="mt-6 rounded-xl border border-edge bg-canvas-sunken p-5 text-body-sm text-ink-muted">
            No action ran, so there is no recovery curve. The pool charged its base fee the whole
            time.
          </p>
        )}

        {action ? (
          <div className="mt-4 rounded-xl border border-edge bg-canvas-sunken p-5">
            <p className="data-label text-ink-faint">Fee actually charged</p>
            <p className="mt-2 text-body-sm text-ink-secondary">
              {formatFee(action.appliedFeePips)}, read from the PoolManager swap event (what the
              pool charged, not what the hook returned).
            </p>
            <div className="mt-3">
              <HexValue
                value={action.appliedTxHash}
                href={`${EXPLORER}${action.appliedTxHash}`}
                label="tx"
              />
            </div>
          </div>
        ) : null}

        {onChain ? (
          <div className="mt-4 rounded-xl border border-edge bg-canvas-sunken p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="data-label text-ink-faint">
                {onChain.networkLabel} · chain {onChain.chainId}
              </p>
              <p className="data-label text-watch">Builder-controlled pool</p>
            </div>
            <div className="mt-3 space-y-2">
              <HexValue value={onChain.registry} label="registry" />
              <HexValue value={onChain.hook} label="hook" />
            </div>
            <p className="mt-3 text-body-xs text-ink-faint">{onChain.addressStatus}</p>
          </div>
        ) : null}
      </section>
    </LazyMotion>
  );
}

function Stat({
  label,
  children,
  tone = "text-ink",
}: {
  label: string;
  children: React.ReactNode;
  tone?: string;
}) {
  return (
    <div className="rounded-lg border border-edge bg-canvas-sunken p-4">
      <p className="data-label text-ink-faint">{label}</p>
      <p className={`mt-1.5 font-data text-[15px] tabular ${tone}`}>{children}</p>
    </div>
  );
}
