import type { EventState } from "@/lib/chain/registryAbi";
import { eventTypeCode, eventTypeLabel } from "@/lib/chain/eventTypes";
import {
  formatDeclaredAmount,
  formatUnixDate,
  formatUnixSeconds,
  truncateAddress,
  truncateHash,
} from "@/lib/format";
import { EVENT_STATE_REGISTRY_ADDRESS, explorerAddressUrl, explorerTxUrl } from "@/lib/chain/chain";
import { findTrackedTokenByTestnetAddress } from "@/lib/chain/tokenAddresses";

export interface ManifestTagProps {
  id: bigint;
  event: EventState;
  txInfo: { txHash: `0x${string}`; blockNumber: bigint } | null | "loading";
  size?: "hero" | "compact";
}

function statusStamp(event: EventState): { label: string; tone: "clearance" | "duty" | "hold" } {
  if (event.challenged && !event.resolved) return { label: "UNDER DISPUTE", tone: "hold" };
  if (event.challenged && event.resolved && event.challengerWon) return { label: "CHALLENGE UPHELD", tone: "duty" };
  if (event.challenged && event.resolved && !event.challengerWon) return { label: "CHALLENGE DENIED", tone: "clearance" };
  return { label: "CLEARED", tone: "clearance" };
}

const TONE_CLASSES: Record<string, string> = {
  clearance: "border-clearance text-clearance",
  duty: "border-duty text-duty",
  hold: "border-hold text-hold",
};

function AgreementDots({ n, of = 3 }: { n: number; of?: number }) {
  return (
    <span className="inline-flex items-center gap-[3px]" aria-label={`${n} of ${of} parses agree`}>
      {Array.from({ length: of }, (_, i) => (
        <span
          key={i}
          className={`h-2 w-2 rounded-full border ${
            i < n ? "border-kraft-line bg-kraft-line" : "border-kraft-line/50 bg-transparent"
          }`}
        />
      ))}
    </span>
  );
}

export function ManifestTag({ id, event, txInfo, size = "hero" }: ManifestTagProps) {
  const stamp = statusStamp(event);
  const tracked = findTrackedTokenByTestnetAddress(event.token);
  const minAgreement = Math.min(
    event.agreement.eventTypeAgreement,
    event.agreement.effectiveDateAgreement,
    event.agreement.declaredAmountAgreement,
  );

  return (
    <div
      className={`relative -rotate-1 border border-kraft-line/60 bg-kraft bg-kraft-fiber text-kraft-line shadow-[0_18px_40px_-12px_rgba(0,0,0,0.65)] transition-transform hover:rotate-0 ${
        size === "hero" ? "w-full max-w-xl p-6 sm:p-8" : "w-full p-5"
      }`}
    >
      {/* grommet holes */}
      <span className="absolute left-4 top-4 h-2.5 w-2.5 rounded-full bg-dock ring-2 ring-kraft-dark/70" aria-hidden />
      <span className="absolute right-4 top-4 h-2.5 w-2.5 rounded-full bg-dock ring-2 ring-kraft-dark/70" aria-hidden />

      <div className="flex items-center justify-between gap-3 pt-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-kraft-line/70">
          Manifest entry No. {id.toString().padStart(4, "0")}
        </p>
        <div
          className={`shrink-0 rotate-[6deg] rounded-sm border-2 px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.12em] ${TONE_CLASSES[stamp.tone]} bg-kraft/40 mix-blend-multiply`}
        >
          {stamp.label}
        </div>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className={`font-stencil tracking-stencil ${size === "hero" ? "text-2xl sm:text-3xl" : "text-lg"}`}>
            {eventTypeCode(event.eventType)}
          </h3>
          <p className="text-sm text-kraft-line/80">{eventTypeLabel(event.eventType)}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-kraft-line/70">Underlying</p>
          <p className="font-mono text-sm font-bold">{tracked?.symbol ?? truncateAddress(event.token)}</p>
          {tracked && !tracked.testnetContractLive && (
            <p className="mt-0.5 max-w-[9rem] font-mono text-[10px] leading-tight text-duty">
              label only, no testnet contract
            </p>
          )}
        </div>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-kraft-line/30 pt-4 font-mono text-[12px] sm:grid-cols-3">
        <div>
          <dt className="uppercase tracking-[0.08em] text-kraft-line/60">Effective</dt>
          <dd className="tabular">{formatUnixDate(event.facts.effectiveDate)}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.08em] text-kraft-line/60">Declared</dt>
          <dd className="tabular">{formatDeclaredAmount(event.facts.declaredAmount, event.facts.currency)}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.08em] text-kraft-line/60">Bond</dt>
          {/* Plain "USDT0" rather than the tugrik-sign glyph: at 12px in Roboto Mono the
              character's advance width visually collides with a following digit. */}
          <dd className="tabular">{formatDeclaredAmount(event.bondAmount, "USDT0")}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.08em] text-kraft-line/60">Posted</dt>
          <dd className="tabular">{formatUnixSeconds(event.timestamp)}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.08em] text-kraft-line/60">Next scheduled</dt>
          <dd className="tabular">{event.nextEventDate > 0n ? formatUnixDate(event.nextEventDate) : "none announced"}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-[0.08em] text-kraft-line/60">Severity</dt>
          <dd className="tabular">
            {event.severity.severity > 0 ? "+" : ""}
            {event.severity.severity} &middot; {event.severity.confidence}% conf.
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between border-t border-kraft-line/30 pt-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-kraft-line/60">Inspector agreement</p>
          <div className="mt-1 flex items-center gap-2">
            <AgreementDots n={minAgreement} />
            <span className="font-mono text-[11px]">{minAgreement}/3 core fields</span>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-kraft-line/60">Tracking No.</p>
          <p className="font-mono text-[11px]">{truncateHash(event.sourceContentHash)}</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 border-t border-kraft-line/30 pt-4 font-mono text-[11px] uppercase tracking-[0.06em]">
        {event.sourceUrl ? (
          <a
            href={event.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="text-tracking underline decoration-tracking/40 underline-offset-4 hover:text-kraft-line"
          >
            Source filing &#8599;
          </a>
        ) : (
          <span className="text-kraft-line/50">source filing unavailable</span>
        )}
        {txInfo === "loading" && <span className="text-kraft-line/50">locating on-chain record&hellip;</span>}
        {txInfo && txInfo !== "loading" && (
          <a
            href={explorerTxUrl(txInfo.txHash)}
            target="_blank"
            rel="noreferrer"
            className="text-tracking underline decoration-tracking/40 underline-offset-4 hover:text-kraft-line"
          >
            On-chain record &#8599;
          </a>
        )}
        {txInfo === null && (
          <a
            href={explorerAddressUrl(EVENT_STATE_REGISTRY_ADDRESS)}
            target="_blank"
            rel="noreferrer"
            className="text-tracking underline decoration-tracking/40 underline-offset-4 hover:text-kraft-line"
          >
            Verify via getEvent({id.toString()}) on the registry &#8599;
          </a>
        )}
      </div>
    </div>
  );
}
