import type { DataMode } from "@/lib/risk/model";

const tone: Record<DataMode, string> = {
  LIVE: "border-normal/50 bg-normal/10 text-normal",
  OBSERVED: "border-confirm/50 bg-confirm/10 text-confirm",
  REPLAY: "border-signal/50 bg-signal/10 text-signal",
  SIMULATED: "border-watch/50 bg-watch/10 text-watch",
};

const lightTone: Record<DataMode, string> = {
  LIVE: "border-normal bg-normal/10 text-coal",
  OBSERVED: "border-confirm bg-confirm/10 text-coal",
  REPLAY: "border-black/40 bg-black/[0.04] text-coal",
  SIMULATED: "border-watch bg-watch/10 text-coal",
};

export function DataModeLabel({ mode, onLight = false }: { mode: DataMode; onLight?: boolean }) {
  return (
    <span
      className={`inline-flex min-h-6 items-center border px-2 font-data text-[10px] font-semibold tracking-[0.06em] ${
        onLight ? lightTone[mode] : tone[mode]
      }`}
    >
      {mode}
    </span>
  );
}
