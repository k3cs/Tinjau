import Link from "next/link";

import { CapabilityBadge } from "@/components/capability-badge";
import { PRODUCT_CAPABILITIES } from "@/lib/product/capabilities";
import { XLAYER_TESTNET_PROOF } from "@/lib/product/deployments";

/**
 * The built / not-built line, as a count and a link.
 *
 * This section used to reprint all eleven capabilities with their evidence and
 * limitation strings, which is exactly what `/proof` and `/roadmap` are for. It
 * printed about 320 words to say something a tally says better, and a reader who
 * wants the detail is one click away from the page that owns it.
 */
const TALLY = ["IMPLEMENTED", "HISTORICAL", "PENDING", "ROADMAP"] as const;

export function ProofLedger() {
  const counts = TALLY.map((maturity) => ({
    maturity,
    count: PRODUCT_CAPABILITIES.filter((c) => c.maturity === maturity).length,
  })).filter((row) => row.count > 0);

  return (
    <section className="section-rule bg-canvas-sunken" aria-labelledby="proof-ledger-title">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="data-label text-ink-faint">Proof ledger</p>
            <h2
              id="proof-ledger-title"
              className="mt-4 max-w-[18ch] font-display text-section-sm text-ink lg:text-section-lg"
            >
              What exists. What does not.
            </h2>
          </div>
          <p className="max-w-[42ch] text-body-sm text-ink-muted">
            Maturity describes the capability. Data mode describes the material. Neither is
            inferred from a nice animation.
          </p>
        </div>

        <dl className="mt-10 grid gap-px border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-4">
          {counts.map(({ maturity, count }) => (
            <div key={maturity} className="bg-canvas p-5">
              <dt>
                <CapabilityBadge maturity={maturity} />
              </dt>
              <dd className="mt-3 font-data text-[30px] tabular text-ink">{count}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-8 grid gap-px border border-edge bg-edge md:grid-cols-[1fr_1fr_auto]">
          <div className="bg-canvas px-5 py-4">
            <p className="data-label text-ink-faint">Verified network</p>
            <p className="mt-2 text-body-sm font-medium text-ink">
              {XLAYER_TESTNET_PROOF.name} · chain {XLAYER_TESTNET_PROOF.chainId}
            </p>
          </div>
          <div className="bg-canvas px-5 py-4">
            <p className="data-label text-ink-faint">Truth boundary</p>
            <p className="mt-2 text-body-sm text-ink-muted">
              Historical prototype deployed. Final integration pending.
            </p>
          </div>
          <Link
            href="/proof"
            className="inline-flex min-h-16 items-center justify-center bg-signal px-6 font-body text-body-sm font-medium text-black transition-colors duration-150 ease-tinjau hover:bg-signal-soft"
          >
            Open the ledger
            <span aria-hidden className="ml-2">
              &rarr;
            </span>
          </Link>
        </div>
      </div>
    </section>
  );
}
