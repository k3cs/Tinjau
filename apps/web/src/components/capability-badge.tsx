import type { CapabilityMaturity } from "@/lib/product/capabilities";

const tone: Record<CapabilityMaturity, string> = {
  IMPLEMENTED: "border-maturity-implemented/60 text-maturity-implemented",
  HISTORICAL: "border-maturity-historical/60 text-maturity-historical",
  PENDING: "border-maturity-pending/60 text-maturity-pending",
  ROADMAP: "border-maturity-roadmap/70 text-ink-muted",
};

const lightTone: Record<CapabilityMaturity, string> = {
  IMPLEMENTED: "border-maturity-implemented bg-normal/10 text-coal",
  HISTORICAL: "border-maturity-historical bg-confirm/10 text-coal",
  PENDING: "border-maturity-pending bg-watch/10 text-coal",
  ROADMAP: "border-maturity-roadmap bg-black/[0.04] text-coal",
};

export function CapabilityBadge({ maturity, onLight = false }: { maturity: CapabilityMaturity; onLight?: boolean }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center border px-2 font-data text-[10px] font-semibold tracking-[0.06em] ${
        onLight ? lightTone[maturity] : tone[maturity]
      }`}
    >
      {maturity}
    </span>
  );
}
