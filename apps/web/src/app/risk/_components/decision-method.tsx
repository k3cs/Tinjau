import Link from "next/link";

import { AuthorityDiagram } from "@/components/diagrams/authority-diagram";
import { ContainmentDiagram } from "@/components/diagrams/containment-diagram";
import { FeeLifecycleDiagram } from "@/components/diagrams/fee-lifecycle-diagram";
import { getScenario } from "@/lib/handoff/scenarios";

/**
 * The method, before the two worked examples below it.
 *
 * These three drawings were spread across the landing page, where they were
 * answering "how does it work" to a reader who had not yet decided they cared.
 * Together they are the actual answer to what the model is for and why it is
 * safe to use one, so they belong on the page a reader opens in order to ask
 * exactly that.
 *
 * The order is an argument. The model does a job a rule cannot (identity and
 * language), the contract holds authority the model never gets, and the action
 * ends on a clock nothing can extend. Each one is a drawing because each one is
 * a claim that can be checked by looking rather than by being believed.
 */
const MODEL_JOBS = [
  ["Resolve who is being talked about", "A ticker, a company name and a wrapper token are three strings for one asset."],
  ["Collapse syndication", "Four outlets carrying one story are one source. Counting is the easy half; deciding what counts is not."],
  ["Notice a claim is hedged", "“reportedly” and “confirmed” are different facts, and paraphrase destroys the difference."],
  ["Say why confidence moved", "A number nobody can interrogate is not evidence, it is a vote."],
] as const;

export function DecisionMethod() {
  const rumour = getScenario("rumour-watch");
  const confirmed = getScenario("confirmed-protect");
  const caveat = confirmed.caveat;

  const sources = rumour.record.evidence.map((claim) => ({
    label: claim.publisherOrAuthor ?? "An anonymous post",
    sourceClass: claim.sourceClass,
  }));

  return (
    <>
      <section className="section-rule bg-canvas" aria-labelledby="model-job-title">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="data-label text-signal">What the model is for</p>
            <h2
              id="model-job-title"
              className="mt-4 font-display text-section-sm text-ink lg:text-section-lg"
            >
              Language is the part a rule cannot do.
            </h2>
            <p className="mt-5 max-w-[52ch] text-body-md text-ink-secondary">
              Deciding whether to act is arithmetic, and arithmetic is what the contract does.
              Working out what arrived, who said it, and whether two reports are one report is
              not, and that is the only place a model is used here.
            </p>
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
            <ol className="border-t border-edge">
              {MODEL_JOBS.map(([job, why], index) => (
                <li
                  key={job}
                  className="grid gap-1.5 border-b border-edge py-5 sm:grid-cols-[2.5rem_1fr] sm:gap-4"
                >
                  <span className="font-data text-[11px] text-ink-faint">0{index + 1}</span>
                  <div>
                    <h3 className="text-body-sm font-semibold text-ink">{job}</h3>
                    <p className="mt-1.5 text-body-sm text-ink-muted">{why}</p>
                  </div>
                </li>
              ))}
            </ol>

            <ContainmentDiagram
              sources={sources}
              usableOrigins={rumour.usableOriginCount}
              state={rumour.record.state}
            />
          </div>
        </div>
      </section>

      <section className="section-rule bg-canvas-sunken" aria-labelledby="authority-title">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.62fr_1.38fr] lg:items-center">
            <div>
              <p className="data-label text-signal">The boundary</p>
              <h2
                id="authority-title"
                className="mt-4 max-w-[15ch] font-display text-section-sm text-ink lg:text-section-lg"
              >
                The model never gets the keys.
              </h2>
              <p className="mt-5 max-w-[40ch] text-body-md text-ink-muted">
                It can read, group and argue. It cannot raise a fee, extend one, or decide when
                protection ends. The contract can reject anything it proposes, and does.
              </p>
            </div>
            <AuthorityDiagram />
          </div>
        </div>
      </section>

      <section className="section-rule bg-canvas" aria-labelledby="lifecycle-title">
        <div className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <p className="data-label text-ink-faint">The action</p>
            <h2
              id="lifecycle-title"
              className="mt-4 font-display text-section-sm text-ink lg:text-section-lg"
            >
              One fee. On a clock it cannot reset.
            </h2>
            <p className="mt-5 max-w-[52ch] text-body-md text-ink-secondary">
              Nobody sends a transaction to end it and no model decides when it is over. The clock
              runs out and the fee is back at base.
            </p>
          </div>

          <div className="mt-8">
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

          {caveat ? (
            <div className="mt-8 rounded-xl border-2 border-watch bg-watch/[0.07] p-5 sm:p-6">
              <p className="data-label text-watch-soft">{caveat.headline}</p>
              <p className="mt-3 max-w-[80ch] text-body-sm text-ink-secondary">
                Tinjau reaches PROTECT on none of the four frozen replay scenarios. To show the
                bounded action at all, real replayed filing evidence was paired with a constructed
                price path on a pool we control. The confirmation verdict is the engine&rsquo;s.
                The price path is not real.{" "}
                <Link href="/proof" className="text-signal underline underline-offset-4">
                  The measured result, in full
                </Link>
                .
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </>
  );
}
