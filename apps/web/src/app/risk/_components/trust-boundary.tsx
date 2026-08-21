import { formatFee } from "@/lib/risk/format";
import type { ScenarioView } from "@/lib/handoff/scenarios";

const AI_MAY = [
  "Read ambiguous language and extract a structured claim",
  "Decide which company and token a claim refers to",
  "Group republished copies back to their origin",
  "Notice that two claims contradict each other",
  "Explain why its confidence moved",
  "Propose a risk state",
];

const AI_MAY_NOT = [
  "Set a fee, or any number the pool charges",
  "Choose a threshold at run time",
  "Authorise an action, or overrule a refusal",
  "Extend a protection, or cancel a cooldown",
  "Move funds, or touch liquidity",
  "Change the state that is already recorded on chain",
];

const CONTRACT_ENFORCES = [
  "The asset and pool are on the supported list",
  "The state transition is one the rules allow",
  "The signature, nonce and freshness are valid",
  "The fee never exceeds the ceiling",
  "The duration never exceeds the maximum",
  "The cooldown has elapsed",
  "Recovery runs on the clock, with no keeper and no model",
];

/**
 * §0.6's two trust domains, made concrete against the record on screen.
 *
 * The point a judge has to be able to reach from this screen is that the model
 * is not in the authorisation path. So the panel names what the AI may do, what
 * it may not, and then shows this record's own refusal. The policy computed a
 * target fee and the gate declined to authorise it.
 */
export function TrustBoundary({ scenario }: { scenario: ScenarioView }) {
  const { record } = scenario;
  const authorized = record.action.authorized;

  return (
    <section aria-labelledby="trust-boundary" className="rounded-xl border border-edge bg-surface">
      <div className="border-b border-edge p-6">
        <h2 id="trust-boundary" className="font-display text-heading-sm text-ink">
          AI proposes. The contract decides.
        </h2>
        <p className="mt-1 max-w-3xl text-body-sm text-ink-muted">
          The model produces structured evidence. Deterministic code and the contract decide
          whether anything is allowed to happen. Nothing the model returns can widen those limits.
        </p>
      </div>

      <div className="grid gap-px bg-edge md:grid-cols-2">
        <div className="bg-surface p-6">
          <p className="data-label text-confirm-soft">AI domain</p>
          <ul className="mt-4 space-y-2">
            {AI_MAY.map((item) => (
              <li key={item} className="flex gap-2.5 text-body-sm text-ink-secondary">
                <span aria-hidden className="mt-2 h-px w-3 shrink-0 bg-confirm-soft" />
                {item}
              </li>
            ))}
          </ul>

          <p className="data-label mt-7 text-protect-soft">Forbidden to the AI</p>
          <ul className="mt-4 space-y-2">
            {AI_MAY_NOT.map((item) => (
              <li key={item} className="flex gap-2.5 text-body-sm text-ink-muted">
                <span aria-hidden className="mt-2 h-px w-3 shrink-0 bg-protect-soft" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-surface p-6">
          <p className="data-label text-signal">Deterministic domain</p>
          <ul className="mt-4 space-y-2">
            {CONTRACT_ENFORCES.map((item) => (
              <li key={item} className="flex gap-2.5 text-body-sm text-ink-secondary">
                <span aria-hidden className="mt-2 h-px w-3 shrink-0 bg-signal" />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-7 rounded-lg border border-edge-strong bg-canvas p-4">
            <p className="data-label text-ink-faint">On this record</p>
            {authorized ? (
              <p className="mt-2 text-body-sm text-ink-secondary">
                The gate authorised a bounded fee of{" "}
                <span className="font-data text-ink">
                  {formatFee(record.action.requestedFee)}
                </span>{" "}
                for at most{" "}
                <span className="font-data text-ink">
                  {record.action.maximumDurationSec.toLocaleString()} s
                </span>
                , inside a ceiling of{" "}
                <span className="font-data text-ink">{formatFee(record.action.maxFee)}</span> it
                cannot exceed.
              </p>
            ) : (
              <p className="mt-2 text-body-sm text-ink-secondary">
                The policy engine&rsquo;s target fee for this state was{" "}
                <span className="font-data text-ink">
                  {formatFee(String(scenario.policyTargetFee))}
                </span>
                . Because the state is{" "}
                <span className="font-data text-watch">{record.state}</span>, the gate authorised
                nothing and the pool kept charging its base fee of{" "}
                <span className="font-data text-ink">{formatFee(record.action.baseFee)}</span>.
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
