import { EVENT_STATE_REGISTRY_ADDRESS, explorerAddressUrl } from "@/lib/chain/chain";

export function SiteFooter() {
  return (
    <footer className="border-t border-dock-line/80 bg-dock-raised/40">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 text-[12px] text-bone-muted sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="max-w-xl leading-relaxed">
          Tinjau posts nothing it can&apos;t point to. Every figure on this site traces to a
          source document, a transaction, or a published study — never a rounded-up claim.
        </p>
        <a
          href={explorerAddressUrl(EVENT_STATE_REGISTRY_ADDRESS)}
          target="_blank"
          rel="noreferrer"
          className="whitespace-nowrap font-mono text-[11px] text-tracking underline decoration-tracking/40 underline-offset-4 hover:text-bone"
        >
          EventStateRegistry ↗ {EVENT_STATE_REGISTRY_ADDRESS.slice(0, 10)}…
        </a>
      </div>
    </footer>
  );
}
