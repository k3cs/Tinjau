import type { CapabilityMaturity } from "@/lib/product/capabilities";

const tone: Record<CapabilityMaturity, string> = {
  IMPLEMENTED: "border-maturity-implemented/60 text-maturity-implemented",
  HISTORICAL: "border-maturity-historical/60 text-confirm-soft",
  PENDING: "border-maturity-pending/60 text-watch-soft",
  ROADMAP: "border-maturity-roadmap/70 text-ink-muted",
};

export function CapabilityBadge({ maturity }: { maturity: CapabilityMaturity }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center border px-2 font-data text-[10px] font-semibold tracking-[0.06em] ${tone[maturity]}`}
    >
      {maturity}
    </span>
  );
}
