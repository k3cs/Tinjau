import type { RiskState } from "@/lib/risk/model";

const tone: Record<RiskState, string> = {
  NORMAL: "bg-normal",
  WATCH: "bg-watch",
  PROTECT: "bg-protect",
};

export function StatusMark({ state, className = "" }: { state: RiskState; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block h-2.5 w-2.5 shrink-0 ${state === "PROTECT" ? "rotate-45" : "rounded-full"} ${tone[state]} ${className}`}
    />
  );
}
