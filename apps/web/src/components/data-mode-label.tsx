import type { DataMode } from "@/lib/risk/model";

const tone: Record<DataMode, string> = {
  LIVE: "border-normal/50 bg-normal/10 text-normal",
  OBSERVED: "border-confirm/50 bg-confirm/10 text-confirm",
  REPLAY: "border-signal/50 bg-signal/10 text-signal",
  SIMULATED: "border-watch/50 bg-watch/10 text-watch",
};

export function DataModeLabel({ mode }: { mode: DataMode }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center rounded border px-2 font-data text-[10px] font-semibold tracking-[0.06em] ${tone[mode]}`}
    >
      {mode}
    </span>
  );
}
