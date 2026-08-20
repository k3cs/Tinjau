import { DataModeLabel } from "@/components/data-mode-label";
import { ExternalEvidenceLink } from "@/components/external-evidence-link";
import { formatUtc } from "@/lib/risk/format";
import type { EvidenceClaimView } from "@/lib/risk/model";

const relationTone = {
  ORIGIN: "border-signal text-signal",
  SUPPORTS: "border-normal text-normal",
  CONTRADICTS: "border-protect text-protect",
  DUPLICATE: "border-watch text-watch",
} as const;

export function EvidenceCircuit({ evidence }: { evidence: EvidenceClaimView[] }) {
  const grouped = Array.from(
    evidence.reduce((groups, item) => {
      const group = groups.get(item.independenceGroup) ?? [];
      group.push(item);
      groups.set(item.independenceGroup, group);
      return groups;
    }, new Map<string, EvidenceClaimView[]>()),
  );

  return (
    <section className="border-t border-edge bg-canvas-soft/50 p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-display text-ink">Evidence circuit</h2>
          <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-ink-secondary">
            {evidence.length} claims collapse into {grouped.length} independence groups. Outlet count is not source count.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 font-data text-[10px] text-ink-muted" aria-label="Relation legend">
          {Object.entries(relationTone).map(([relation, tone]) => (
            <span key={relation} className="flex items-center gap-1.5">
              <span aria-hidden className={`h-2 w-2 border ${tone}`} />
              {relation}
            </span>
          ))}
        </div>
      </div>

      <ol className="mt-6 grid gap-4 lg:grid-cols-2" aria-label="Evidence independence groups">
        {grouped.map(([groupId, claims], groupIndex) => {
          const origin = claims.find((claim) => claim.relation === "ORIGIN") ?? claims[0];
          return (
            <li key={groupId} className="relative rounded-md border border-edge bg-canvas p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="data-label text-ink-muted">Independent origin {groupIndex + 1}</p>
                  <p className="mt-1 font-data text-xs text-ink-secondary">{origin.publisherOrAuthor ?? "Simulated author"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded border border-edge-strong px-2 py-1 font-data text-[10px] text-ink-secondary">
                    {origin.sourceClass}
                  </span>
                  <DataModeLabel mode={origin.dataMode} />
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-ink-secondary">{origin.claimTextOrPointer}</p>
              <p className="mt-3 break-all font-data text-[10px] text-ink-muted">{groupId}</p>
              <ExternalEvidenceLink href={origin.sourceUrl} />

              {claims.length > 1 && (
                <details className="mt-4 border-t border-edge pt-3">
                  <summary className="min-h-8 cursor-pointer font-data text-[11px] font-medium text-ink-secondary marker:text-signal">
                    Inspect {claims.length - 1} related claim{claims.length > 2 ? "s" : ""}
                  </summary>
                  <ol className="mt-3 space-y-3">
                    {claims
                      .filter((claim) => claim.claimId !== origin.claimId)
                      .map((claim) => (
                        <li key={claim.claimId} className={`border-l-2 pl-3 ${relationTone[claim.relation]}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-data text-[10px] font-semibold">{claim.relation}</span>
                            <span className="font-data text-[10px] text-ink-muted">{claim.sourceClass}</span>
                            <DataModeLabel mode={claim.dataMode} />
                          </div>
                          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">{claim.claimTextOrPointer}</p>
                          <p className="mt-1 font-data text-[10px] text-ink-muted">
                            {claim.publisherOrAuthor ?? "No named author"} · {formatUtc(claim.publishedAt)}
                          </p>
                          <ExternalEvidenceLink href={claim.sourceUrl} />
                        </li>
                      ))}
                  </ol>
                </details>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
