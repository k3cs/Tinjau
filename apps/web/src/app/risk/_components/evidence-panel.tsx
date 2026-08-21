import { ContainmentDiagram } from "@/components/diagrams/containment-diagram";
import { DataModeLabel } from "@/components/data-mode-label";
import { formatUtc } from "@/lib/risk/format";
import type { ScenarioView } from "@/lib/handoff/scenarios";
import type { EvidenceClaimView } from "@/lib/risk/model";

const RELATION_LABEL: Record<EvidenceClaimView["relation"], string> = {
  ORIGIN: "Origin",
  SUPPORTS: "Supports",
  CONTRADICTS: "Contradicts",
  DUPLICATE: "Republished copy",
};

const CLASS_TONE: Record<EvidenceClaimView["sourceClass"], string> = {
  OFFICIAL: "border-normal text-normal",
  NEWS: "border-confirm text-confirm",
  RUMOR: "border-watch text-watch",
};

/**
 * The claims behind the state, with their provenance intact.
 *
 * Two rules from the handoff are load-bearing here:
 *
 *  - **Independence is counted by origin, not by outlet.** Four outlets sharing
 *    one `independenceGroup` are one source. The count shown is
 *    `usableOriginCount`, the number that survived the independence and
 *    self-revision checks, not the raw origin count, which flatters us.
 *  - **A claim rejected for incomplete provenance is displayed, not hidden.**
 *    It is part of why the state is what it is; dropping it would make the
 *    state unexplainable.
 */
export function EvidencePanel({ scenario }: { scenario: ScenarioView }) {
  const claims = scenario.record.evidence;
  const groups = new Set(claims.map((claim) => claim.independenceGroup));

  return (
    <section aria-labelledby="evidence-panel">
      <h2 id="evidence-panel" className="font-display text-heading-sm text-ink">
        Evidence
      </h2>

      <div className="mt-4">
        <ContainmentDiagram
          sources={claims.map((claim) => ({
            label: claim.publisherOrAuthor ?? "An anonymous post",
            sourceClass: claim.sourceClass,
          }))}
          usableOrigins={scenario.usableOriginCount}
          state={scenario.record.state}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 rounded-lg border border-edge bg-canvas-sunken p-4">
        <Count value={claims.length} label="Claims ingested" />
        <Count value={groups.size} label="Distinct origins" />
        <Count
          value={scenario.usableOriginCount}
          label="Usable origins"
          emphasis
          note="After independence and self-revision checks. This is the number the promotion rule reads."
        />
      </div>

      <ol className="mt-5 space-y-3">
        {claims.map((claim) => (
          <li key={claim.claimId} className="rounded-lg border border-edge bg-canvas-sunken p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex min-h-6 items-center rounded border px-2 font-data text-[10px] font-semibold tracking-[0.06em] ${CLASS_TONE[claim.sourceClass]}`}
              >
                {claim.sourceClass}
              </span>
              <DataModeLabel mode={claim.dataMode} />
              <span className="font-data text-[10px] uppercase tracking-[0.06em] text-ink-faint">
                {RELATION_LABEL[claim.relation]}
              </span>
              {claim.officialConfirmation ? (
                <span className="font-data text-[10px] uppercase tracking-[0.06em] text-normal">
                  Officially confirmed
                </span>
              ) : null}
            </div>

            <p className="mt-3 text-body-sm text-ink-secondary">{claim.claimTextOrPointer}</p>

            <dl className="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <Row label="Publisher">{claim.publisherOrAuthor ?? "Not attributed"}</Row>
              <Row label="Published">{formatUtc(claim.publishedAt)}</Row>
              <Row label="Origin group">{claim.independenceGroup}</Row>
              <Row label="Event type">{claim.eventType}</Row>
            </dl>

            <div className="mt-3">
              {claim.sourceUrl ? (
                <a
                  href={claim.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="inline-flex min-h-10 items-center font-data text-[11px] text-signal underline"
                >
                  Open the source
                </a>
              ) : (
                <p className="font-data text-[11px] text-ink-faint">
                  {claim.dataMode === "SIMULATED"
                    ? "No source link, and there cannot be one: this claim was written by us as a safety test."
                    : "No retrievable URL (paywalled original). Shown rather than hidden, because it is part of why this state was chosen."}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Count({
  value,
  label,
  emphasis = false,
  note,
}: {
  value: number;
  label: string;
  emphasis?: boolean;
  note?: string;
}) {
  return (
    <div className="min-w-[8rem]">
      <p
        className={`font-display text-heading-md tabular ${emphasis ? "text-signal" : "text-ink"}`}
      >
        {value}
      </p>
      <p className="data-label mt-1 text-ink-faint">{label}</p>
      {note ? <p className="mt-1 max-w-[16rem] text-body-xs text-ink-faint">{note}</p> : null}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="data-label text-ink-faint">{label}</dt>
      <dd className="mt-0.5 break-words font-data text-[11px] leading-5 text-ink-muted">
        {children}
      </dd>
    </div>
  );
}
