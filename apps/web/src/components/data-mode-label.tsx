import type { DataMode } from "@/lib/risk/model";

/**
 * The data mode, never optional and never quiet.
 *
 * `LIVE`, `OBSERVED`, `REPLAY` and `SIMULATED` change what a number on screen is
 * allowed to mean, so each gets its own hue rather than a shared neutral chip.
 * One tone table, because the site has one theme.
 */
const tone: Record<DataMode, string> = {
  LIVE: "border-normal/50 bg-normal/10 text-normal",
  OBSERVED: "border-confirm/50 bg-confirm/10 text-confirm-soft",
  REPLAY: "border-signal/50 bg-signal/10 text-signal",
  SIMULATED: "border-watch/50 bg-watch/10 text-watch-soft",
};

export function DataModeLabel({ mode }: { mode: DataMode }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center border px-2 font-data text-[10px] font-semibold tracking-[0.06em] ${tone[mode]}`}
    >
      {mode}
    </span>
  );
}
