import Link from "next/link";

const context = [
  ["Reference asset", "wNVDAx"],
  ["Pool", "wNVDAx / USDG"],
  ["Network", "X Layer · 196"],
  ["Schema", "tinjau.risk / 1.0.0 draft"],
] as const;

const evidencePath = [
  { label: "Source evidence", status: "Partial handoff", tone: "text-watch" },
  { label: "Evidence graph", status: "Not evaluated", tone: "text-ink-muted" },
  { label: "Policy gate", status: "Fail closed", tone: "text-signal" },
  { label: "Pool action", status: "Not authorized", tone: "text-protect" },
] as const;

export default function HomePage() {
  return (
    <div className="circuit-field min-h-[calc(100vh-8rem)]">
      <section className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div className="control-surface grid divide-y divide-edge overflow-hidden sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
          {context.map(([label, value]) => (
            <div key={label} className="px-4 py-3">
              <p className="data-label text-ink-muted">{label}</p>
              <p className="mt-1 font-data text-sm text-ink-secondary">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 overflow-hidden rounded-lg border border-edge bg-canvas">
          <div className="grid lg:grid-cols-12">
            <section className="min-h-[390px] border-b border-edge p-6 sm:p-8 lg:col-span-5 lg:border-b-0 lg:border-r lg:p-10">
              <div className="flex items-center justify-between gap-4">
                <p className="data-label text-ink-muted">Risk state</p>
                <span className="rounded border border-watch/50 bg-watch/10 px-2.5 py-1 font-data text-[11px] font-medium uppercase tracking-[0.06em] text-watch">
                  Integration pending
                </span>
              </div>

              <div className="mt-10 flex items-end gap-5">
                <span className="font-display text-[clamp(5rem,12vw,9rem)] font-semibold leading-[0.78] tracking-display text-ink">
                  —
                </span>
                <span className="mb-2 font-data text-sm uppercase tracking-[0.06em] text-ink-muted">
                  No inferred state
                </span>
              </div>

              <h1 className="mt-12 max-w-xl text-balance font-display text-3xl font-semibold leading-tight tracking-display text-ink sm:text-4xl">
                Tinjau waits for complete evidence before it changes risk.
              </h1>
              <p className="mt-4 max-w-[65ch] text-base leading-relaxed text-ink-secondary">
                A draft risk schema is available, but the final scenario, market confirmation, and
                action records are not. The interface fails closed instead of presenting partial
                input as <span className="font-data text-normal">NORMAL</span>.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/compare"
                  className="inline-flex min-h-11 items-center rounded-md bg-signal px-4 font-data text-xs font-semibold uppercase tracking-[0.06em] text-black transition-colors hover:bg-white"
                >
                  Inspect comparison gate
                </Link>
                <span className="inline-flex min-h-11 items-center rounded-md border border-edge-strong px-4 font-data text-xs uppercase tracking-[0.06em] text-ink-muted">
                  Aggressive fee not authorized
                </span>
              </div>
            </section>

            <section className="border-b border-edge p-6 sm:p-8 lg:col-span-4 lg:border-b-0 lg:border-r lg:p-10">
              <p className="data-label text-ink-muted">OKX / X Layer confirmation</p>
              <p className="mt-7 font-display text-4xl font-semibold tracking-display text-ink-muted">
                UNAVAILABLE
              </p>
              <p className="mt-4 max-w-sm leading-relaxed text-ink-secondary">
                No final market-confirmation payload has been handed to the frontend. Unavailable
                means “could not evaluate,” not “looked and found nothing.”
              </p>

              <dl className="mt-9 divide-y divide-edge border-y border-edge font-data text-xs">
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-ink-muted">Freshness</dt>
                  <dd className="text-ink-secondary">—</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-ink-muted">Block</dt>
                  <dd className="text-ink-secondary">—</dd>
                </div>
                <div className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-ink-muted">Exit depth</dt>
                  <dd className="text-ink-secondary">—</dd>
                </div>
              </dl>
            </section>

            <section className="p-6 sm:p-8 lg:col-span-3 lg:p-10">
              <p className="data-label text-ink-muted">Pre-registered envelope</p>
              <div className="mt-8 space-y-7">
                <div>
                  <p className="font-display text-4xl font-semibold tracking-display text-ink">0.05%</p>
                  <p className="mt-1 font-data text-xs text-ink-muted">Baseline fee · 500</p>
                </div>
                <div className="h-px bg-edge" />
                <div>
                  <p className="font-display text-4xl font-semibold tracking-display text-protect">2.00%</p>
                  <p className="mt-1 font-data text-xs text-ink-muted">Maximum fee · 20,000</p>
                </div>
                <dl className="grid grid-cols-2 gap-3 font-data text-xs">
                  <div className="rounded border border-edge bg-canvas-soft p-3">
                    <dt className="text-ink-muted">Widen</dt>
                    <dd className="mt-1 text-ink-secondary">1 hour</dd>
                  </div>
                  <div className="rounded border border-edge bg-canvas-soft p-3">
                    <dt className="text-ink-muted">Decay</dt>
                    <dd className="mt-1 text-ink-secondary">5 hours</dd>
                  </div>
                </dl>
              </div>
              <p className="mt-7 text-sm leading-relaxed text-ink-muted">
                These are frozen policy bounds, not proof that an action was requested or applied.
              </p>
            </section>
          </div>

          <section className="border-t border-edge bg-canvas-soft/60 p-4 sm:p-6">
            <div className="grid gap-px overflow-hidden rounded-md border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-4">
              {evidencePath.map((step, index) => (
                <div key={step.label} className="relative bg-canvas px-4 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden
                      className={`h-2.5 w-2.5 rounded-full ${index === 0 ? "bg-watch" : "bg-edge-strong"}`}
                    />
                    <p className="font-data text-xs font-medium uppercase tracking-[0.05em] text-ink-secondary">
                      {step.label}
                    </p>
                  </div>
                  <p className={`mt-2 pl-[22px] text-sm ${step.tone}`}>{step.status}</p>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="mt-5 grid gap-px overflow-hidden rounded-lg border border-edge bg-edge md:grid-cols-[1.2fr_1fr]">
          <div className="bg-canvas p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold tracking-display text-ink">
              Flexible understanding. Deterministic authority.
            </h2>
            <p className="mt-3 max-w-[68ch] leading-relaxed text-ink-secondary">
              AI may parse language, resolve entities, group duplicates, detect contradictions, and
              explain confidence. Versioned policy validates freshness, promotion rules, fee
              ceilings, expiry, cooldown, and recovery.
            </p>
          </div>
          <div className="bg-canvas-soft p-6 sm:p-8">
            <p className="data-label text-ink-muted">Data modes remain explicit</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {["LIVE", "OBSERVED", "REPLAY", "SIMULATED"].map((mode) => (
                <span
                  key={mode}
                  className="rounded border border-edge-strong px-2.5 py-1.5 font-data text-[11px] font-medium tracking-[0.05em] text-ink-secondary"
                >
                  {mode}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm leading-relaxed text-ink-muted">
              No mode is implied by styling alone, and simulated evidence never receives a fake
              source link.
            </p>
          </div>
        </section>
      </section>
    </div>
  );
}
