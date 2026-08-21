import Link from "next/link";

import { ContainmentDiagram } from "@/components/diagrams/containment-diagram";
import { FeeLifecycleDiagram } from "@/components/diagrams/fee-lifecycle-diagram";
import { getScenario } from "@/lib/handoff/scenarios";

/**
 * What the system does about the blind window: two drawings, one caveat.
 *
 * The first is the containment rule on the negative control. The second is the
 * bounded action and its recovery, which exists in only one place on earth: a
 * builder-controlled testnet pool fed a constructed price path. That fact is not
 * a footnote here. It is the figure's own caption and a full-width band above
 * both drawings, because this is the single most misleading thing this project
 * could publish and the handoff says so in `criticalCaveat.uiRequirement`.
 */
export function BoundedResponse() {
  const rumour = getScenario("rumour-watch");
  const confirmed = getScenario("confirmed-protect");
  const caveat = confirmed.caveat;

  // `publisherOrAuthor` is null on the simulated social post, which is the
  // point of that row: it has no masthead to stand behind it.
  const sources = rumour.record.evidence.map((claim) => ({
    label: claim.publisherOrAuthor ?? "An anonymous post",
    sourceClass: claim.sourceClass,
  }));

  return (
    <section className="section-rule bg-canvas" aria-labelledby="response-title">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="data-label text-ink-faint">The response</p>
          <h2 id="response-title" className="mt-4 font-display text-section-sm text-ink lg:text-section-lg">
            One fee. On a clock it cannot reset.
          </h2>
          <p className="mt-5 max-w-[52ch] text-body-md text-ink-secondary">
            Raising what the pool charges per swap is the only move Tinjau can make. It cannot sell
            anything, move anyone&rsquo;s money, or keep the fee up once the clock runs out.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="font-display text-heading-sm text-ink">
              A rumour never earns the higher fee
            </h3>
            <p className="mt-2 max-w-[48ch] text-body-sm text-ink-muted">
              Four outlets running one story are one source, not four. Counting them once is what
              keeps the fee where it is.
            </p>
            <div className="mt-5">
              <ContainmentDiagram
                sources={sources}
                usableOrigins={rumour.usableOriginCount}
                state={rumour.record.state}
              />
            </div>
          </div>

          <div>
            <h3 className="font-display text-heading-sm text-ink">
              And it comes back down on its own
            </h3>
            <p className="mt-2 max-w-[48ch] text-body-sm text-ink-muted">
              Nobody has to send a transaction to end it, and no model gets to decide when it is
              over. The clock runs out and the fee is back.
            </p>
            <div className="mt-5">
              {confirmed.onChain && confirmed.recovery ? (
                <FeeLifecycleDiagram
                  envelope={confirmed.onChain.envelope}
                  measured={confirmed.recovery.measured}
                  caveat={
                    caveat
                      ? `CONSTRUCTED market inputs on a builder-controlled testnet pool. The canonical replay of this event is ${caveat.canonicalReplayState}.`
                      : "Replayed scenario."
                  }
                />
              ) : null}
            </div>
          </div>
        </div>

        {caveat ? (
          <div className="mt-8 rounded-xl border-2 border-watch bg-watch/[0.07] p-5 sm:p-6">
            <p className="data-label text-watch-soft">{caveat.headline}</p>
            <p className="mt-3 max-w-[80ch] text-body-sm text-ink-secondary">
              Tinjau reaches PROTECT on none of the four frozen replay scenarios. To show the
              bounded action at all, real replayed filing evidence was paired with a constructed
              price path on a pool we control. The confirmation verdict is the engine&rsquo;s. The
              price path is not real.{" "}
              <Link href="/risk" className="text-signal underline underline-offset-4">
                The full caveat, and both records
              </Link>
              .
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}
