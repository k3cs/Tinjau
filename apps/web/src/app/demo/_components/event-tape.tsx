import type { DemoSceneId } from "@/lib/demo/walkthrough";

const events = {
  rumor: [
    ["19:11:05Z", "SIMULATED", "X-shaped rumor fixture enters"],
    ["20:33:00Z", "REPLAY", "Four outlets collapse to one origin"],
    ["20:33:00Z", "UNAVAILABLE", "No market confirmation can be derived"],
    ["20:33:00Z", "WATCH", "Aggressive fee and public confirmation blocked"],
  ],
  confirmed: [
    ["12:41:33Z", "OFFICIAL", "SEC 8-K and exhibit are source-pinned"],
    ["12:41:33Z", "REPLAY", "Evidence graph resolves supporting origins"],
    ["PENDING", "MARKET GATE", "T3.3 confirmation output not delivered"],
    ["CURRENT", "WATCH", "No integrated action or transaction claimed"],
  ],
  comparison: [
    ["FROZEN", "INPUT", "Scenario and policy method preregistered"],
    ["SAME", "WINDOW", "All policies receive matched observations"],
    ["PENDING", "RESULT", "T5 output not delivered"],
    ["CLOSED", "CLAIM", "No winner or loss-avoided statement"],
  ],
} as const;

export function EventTape({ scene }: { scene: DemoSceneId }) {
  return (
    <section className="border border-edge bg-canvas" aria-labelledby="event-tape-title">
      <div className="border-b border-edge px-4 py-3"><h2 id="event-tape-title" className="data-label text-ink-muted">Event tape</h2></div>
      <ol className="grid md:grid-cols-4">
        {events[scene].map(([time, status, detail], index) => (
          <li key={`${time}-${status}`} className="border-b border-edge p-4 last:border-b-0 md:border-b-0 md:border-l md:first:border-l-0">
            <p className="font-data text-[10px] text-ink-muted">0{index + 1} · {time}</p>
            <p className="mt-2 font-data text-[10px] font-semibold text-signal">{status}</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{detail}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
