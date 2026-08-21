import { formatUtc } from "@/lib/risk/format";
import type { ScenarioView } from "@/lib/handoff/scenarios";
import type { ConfirmationStatus } from "@/lib/risk/model";

const STATUS_TONE: Record<ConfirmationStatus, string> = {
  CONFIRMED: "border-normal text-normal",
  NOT_CONFIRMED: "border-watch text-watch",
  UNAVAILABLE: "border-edge-strong text-ink-muted",
  STALE: "border-watch text-watch",
};

/**
 * The market leg, kept verbally distinct from the evidence leg.
 *
 * The distinction this panel exists to preserve: `UNAVAILABLE` means we could
 * not look, `NOT_CONFIRMED` means we looked and saw nothing that qualified.
 * Collapsing them would let a gap in the data read as a finding about the
 * market.
 */
const STATUS_MEANING: Record<ConfirmationStatus, string> = {
  CONFIRMED: "We looked, and the pool moved the way a real event moves it.",
  NOT_CONFIRMED: "We looked, and nothing in the market qualified. This is a finding.",
  UNAVAILABLE: "We could not look. There was no usable reading. This is a gap, not a finding.",
  STALE: "The most recent reading is too old to act on.",
};

export function MarketPanel({ scenario }: { scenario: ScenarioView }) {
  const market = scenario.record.marketConfirmation;

  return (
    <section aria-labelledby="market-panel">
      <h2 id="market-panel" className="font-display text-heading-sm text-ink">
        Market confirmation
      </h2>
      <p className="mt-1 text-body-sm text-ink-muted">
        An independent check. Evidence alone never authorises the protective fee.
      </p>

      <div className="mt-4 rounded-lg border border-edge bg-canvas-sunken p-4">
        <span
          className={`inline-flex min-h-7 items-center rounded border px-2.5 font-data text-[11px] font-semibold tracking-[0.06em] ${STATUS_TONE[market.status]}`}
        >
          {market.status}
        </span>
        <p className="mt-3 text-body-sm text-ink-secondary">{STATUS_MEANING[market.status]}</p>
        {scenario.effectiveConfirmation !== market.status ? (
          <p className="mt-2 font-data text-[11px] text-ink-faint">
            Effective after policy rules: {scenario.effectiveConfirmation}
          </p>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Metric label="Observed at">
          {/*
            `observedAt` is nullable and null means nothing was observed at all.
            Rendering a dash here would read as a missing value; rendering the
            assessment instant instead would make an unobserved leg look fresh.
          */}
          {market.observedAt ? (
            formatUtc(market.observedAt)
          ) : (
            <span className="text-ink-faint">Nothing was observed</span>
          )}
        </Metric>
        <Metric label="Block">{market.blockNumber ?? <Absent />}</Metric>
        <Metric label="OKX reference price">
          {market.okxReferencePrice ?? (
            <span className="text-ink-faint">
              Unavailable: no committed index data covers this anchor
            </span>
          )}
        </Metric>
        <Metric label="X Layer pool price">{market.xLayerPoolPrice ?? <Absent />}</Metric>
        <Metric label="Basis">{suffix(market.basisBps, "bps")}</Metric>
        <Metric label="Drawdown">{suffix(market.drawdownBps, "bps")}</Metric>
        <Metric label="Trade velocity">{market.tradeVelocity ?? <Absent />}</Metric>
        <Metric label="Executable exit depth">
          {market.executableExitDepth ? (
            <>
              {market.executableExitDepth}{" "}
              <span className="text-ink-faint">(lower bound)</span>
            </>
          ) : (
            <Absent />
          )}
        </Metric>
        <Metric label="Freshness">{market.fresh ? "Fresh" : "Not fresh"}</Metric>
        <Metric label="Move held">
          {market.antiWickSatisfied ? "Yes" : "No or undetermined"}
        </Metric>
      </dl>

      <p className="mt-5 rounded-lg border border-edge bg-canvas p-4 text-body-sm text-ink-muted">
        The OKX index leg is <span className="text-ink">unavailable</span> for every frozen
        scenario: no committed index data covers any of the anchors, and index history is not
        available retroactively. Confirmation here rests on the X Layer pool leg alone. This is
        not dual-venue confirmation and must not be described as such.
      </p>
    </section>
  );
}

function suffix(value: string | null, unit: string) {
  return value ? (
    <>
      {value} <span className="text-ink-faint">{unit}</span>
    </>
  ) : (
    <Absent />
  );
}

function Absent() {
  return <span className="text-ink-faint">Not available</span>;
}

function Metric({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="data-label text-ink-faint">{label}</dt>
      <dd className="mt-1 font-data text-[12px] leading-5 text-ink-secondary tabular">
        {children}
      </dd>
    </div>
  );
}
