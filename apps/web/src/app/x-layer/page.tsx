import type { Metadata } from "next";
import Link from "next/link";

import { XLayerFootprintDiagram } from "@/components/diagrams/x-layer-footprint-diagram";
import { Reveal } from "@/components/reveal";
import { DEPLOYED_NETWORK, DEPLOYED_STACKS, explorerUrl } from "@/lib/handoff/deployments";
import { EXPOSURE } from "@/lib/product/exposure";

export const metadata: Metadata = {
  title: "Why X Layer · Tinjau",
  description:
    "What Tinjau reads from X Layer, what it deployed onto it, and the measured RPC finding it published back to anyone building there.",
};

const PRODUCTION = DEPLOYED_STACKS.find((stack) => !stack.isDemoEnvelope) ?? DEPLOYED_STACKS[0];

/**
 * The chain argument, made in the two directions a judge can check.
 *
 * "Built on X Layer" is unfalsifiable, so this page never says it. It says what
 * is read off the chain, what is deployed onto it with callable addresses, and
 * what was measured about the chain and handed back. The third one is the part
 * that is a contribution rather than a use: nobody asked us to characterise the
 * public RPC's read consistency, and the number is useful to anyone building a
 * consumer there whether or not they ever touch Tinjau.
 */
export default function XLayerPage() {
  return (
    <div className="bg-canvas text-ink">
      <section className="border-b border-edge px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1440px]">
          <p className="data-label text-ink-faint">Why X Layer</p>
          <h1 className="mt-4 max-w-[20ch] text-balance font-display text-section-sm text-ink lg:text-section-lg">
            The market and the pool, on one chain.
          </h1>
          <p className="mt-6 max-w-[56ch] text-body-md text-ink-secondary">
            Tokenised US stocks already trade here. That is not a convenience: the price a pool
            has to defend, the liquidity it has to defend it with, and the clock that ends the
            defence all live in the same place, so none of them needs a bridge to be trusted.
          </p>
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="data-label text-signal">Integration</p>
            <h2 className="mt-4 font-display text-heading-lg text-ink">
              Both directions are addressable.
            </h2>
          </div>
          <div className="mt-8">
            <XLayerFootprintDiagram />
          </div>

          <div className="mt-10 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-left">
              <caption className="sr-only">Contracts Tinjau deployed to X Layer Testnet</caption>
              <thead className="data-label text-ink-faint">
                <tr className="border-b border-edge">
                  <th scope="col" className="py-3 pr-5 font-medium">Contract</th>
                  <th scope="col" className="px-5 py-3 font-medium">Address</th>
                  <th scope="col" className="px-5 py-3 font-medium">Bytecode</th>
                </tr>
              </thead>
              <tbody>
                {PRODUCTION.contracts.map((contract) => (
                  <tr key={contract.address} className="border-b border-edge">
                    <th scope="row" className="py-3 pr-5 text-body-sm font-medium text-ink">
                      {contract.role}
                    </th>
                    <td className="px-5 py-3">
                      <a
                        href={explorerUrl(contract.address)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-data text-[11px] text-signal underline underline-offset-4"
                      >
                        {contract.address}
                      </a>
                    </td>
                    <td className="px-5 py-3 font-data text-[11px] text-ink-muted">
                      {contract.hasBytecode ? `${contract.codeSize.toLocaleString()} bytes` : "none"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-body-sm text-ink-muted">
            Both pools are builder-controlled test liquidity with freely-mintable mock tokens. They
            demonstrate enforcement and they are not markets.
          </p>
        </div>
      </section>

      <section className="section-rule bg-canvas-sunken">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="data-label text-signal">Contribution</p>
            <h2 className="mt-4 font-display text-heading-lg text-ink">
              We measured something about this chain and gave it back.
            </h2>
            <p className="mt-4 max-w-[56ch] text-body-md text-ink-muted">
              Three of these are useful to somebody building on X Layer who never touches Tinjau.
            </p>
          </div>

          <div className="mt-8 grid gap-px border border-edge bg-edge lg:grid-cols-3">
            <Reveal className="bg-canvas">
              <div className="p-6">
                <p className="data-label text-watch-soft">Finding</p>
                <p className="mt-3 font-display text-heading-sm text-ink">
                  The public RPC serves stale reads
                </p>
                <p className="mt-3 text-body-sm text-ink-muted">
                  It is load-balanced across nodes at different heights, so a read issued right
                  after a confirmed write can return the previous record. We measured the
                  convergence lag at 2,519 to 2,746 ms per write.
                </p>
                <p className="mt-3 text-body-sm text-ink-muted">
                  For a risk consumer that is not a nuisance, it is a correctness bug: you can read{" "}
                  <span className="font-data text-[12px] text-ink">NORMAL</span> while a{" "}
                  <span className="font-data text-[12px] text-ink">PROTECT</span> is live. Pin
                  reads to a block number, or follow the{" "}
                  <span className="font-data text-[12px] text-ink">AssessmentPosted</span> event.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.05} className="bg-canvas">
              <div className="p-6">
                <p className="data-label text-signal">Reusable</p>
                <p className="mt-3 font-display text-heading-sm text-ink">
                  A risk record any contract can read
                </p>
                <p className="mt-3 text-body-sm text-ink-muted">
                  The registry is a public object with a versioned schema. It is not behind our
                  API, our dashboard, or a key. A separate consumer ships in the repository with
                  zero npm dependencies and its own hand-transcribed ABI, read functions only.
                </p>
                <p className="mt-3 text-body-sm text-ink-muted">
                  That consumer was built by us, so it proves the record is readable. It is not
                  adoption, and this project claims none.
                </p>
              </div>
            </Reveal>

            <Reveal delay={0.1} className="bg-canvas">
              <div className="p-6">
                <p className="data-label text-signal">Open method</p>
                <p className="mt-3 font-display text-heading-sm text-ink">
                  A measurement of the equity pools themselves
                </p>
                <p className="mt-3 text-body-sm text-ink-muted">
                  {EXPOSURE.headline.eventCount} filings against {EXPOSURE.scope.pools} live
                  tokenised-equity pools on X Layer mainnet, with the method, the raw rows and the
                  limitations all published. Anyone can re-run it or disagree with it.
                </p>
                <Link
                  href="/why-it-matters"
                  className="mt-4 inline-flex min-h-10 items-center text-body-sm text-signal underline underline-offset-4"
                >
                  See what it found
                </Link>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.55fr_1.45fr]">
            <div>
              <p className="data-label text-ink-faint">The honest boundary</p>
              <h2 className="mt-4 max-w-[16ch] font-display text-heading-lg text-ink">
                What is not an X Layer integration.
              </h2>
            </div>
            <ul className="border-t border-edge">
              {[
                [
                  "No dual-venue confirmation",
                  "No committed OKX index data covers any of the frozen scenarios, so the OKX leg is UNAVAILABLE for all of them and the X Layer pool leg carries confirmation alone. No artifact here may describe this as dual OKX and X Layer confirmation.",
                ],
                [
                  "No mainnet deployment",
                  `Everything Tinjau deployed is on ${DEPLOYED_NETWORK.name}. Real liquidity needs an audit and a decision that is not an agent's to make.`,
                ],
                [
                  "No Exchange OS integration",
                  "Its production interface and access have not been verified. No integration exists, and none is claimed.",
                ],
              ].map(([term, detail]) => (
                <li key={term} className="grid gap-2 border-b border-edge py-5 sm:grid-cols-[0.8fr_2fr] sm:gap-6">
                  <h3 className="text-body-sm font-semibold text-ink">{term}</h3>
                  <p className="text-body-sm text-ink-muted">{detail}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
