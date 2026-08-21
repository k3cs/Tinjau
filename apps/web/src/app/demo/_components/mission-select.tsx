import { DataModeLabel } from "@/components/data-mode-label";
import { MISSIONS } from "@/lib/demo/missions";
import type { MissionId } from "@/lib/demo/mission-types";

export function MissionSelect({ onSelect }: { onSelect: (missionId: MissionId) => void }) {
  return (
    <div className="demo-shell">
      <section className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8 lg:py-20" aria-labelledby="mission-select-title">
        <div className="grid gap-8 border-b border-edge pb-12 lg:grid-cols-[1fr_0.55fr] lg:items-end">
          <div>
            <h1 id="mission-select-title" className="max-w-4xl text-balance font-display text-5xl font-bold tracking-display sm:text-7xl">Choose a field exercise.</h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-ink-secondary">Make bounded decisions. Watch evidence arrive one step at a time. Learn where Tinjau stops an unsafe instruction.</p>
          </div>
          <div className="border-t border-edge pt-5 font-data text-[11px] leading-relaxed text-ink-muted">
            <p>Each mission begins empty.</p>
            <p className="mt-2">No result is revealed before you earn it.</p>
          </div>
        </div>

        <div className="mt-10 border-t border-edge" aria-label="Available missions">
          {MISSIONS.map((mission, index) => (
            <article key={mission.id} className="grid gap-5 border-b border-edge py-7 lg:grid-cols-[0.16fr_0.64fr_0.2fr] lg:items-center">
              <div className="font-data text-[11px] text-ink-muted">0{index + 1} / 03</div>
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="font-display text-3xl font-semibold tracking-display">{mission.title}</h2>
                  <DataModeLabel mode={mission.dataMode} />
                </div>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-secondary">{mission.objective}</p>
                <p className="mt-3 font-data text-[10px] uppercase tracking-[0.06em] text-ink-muted">{mission.stages.length} decisions · {mission.duration}</p>
              </div>
              <button type="button" onClick={() => onSelect(mission.id)} className="inline-flex min-h-12 w-full items-center justify-between border border-signal bg-signal px-4 font-data text-[11px] font-semibold uppercase tracking-[0.06em] text-black transition-colors duration-150 ease-tinjau hover:bg-white lg:justify-center lg:gap-3">
                Start {mission.label}
                <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4" fill="none"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" /></svg>
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
