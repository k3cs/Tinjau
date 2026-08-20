import { ScoreboardTable } from "@/components/scoreboard-table";

export const metadata = {
  title: "Scoreboard — Tinjau",
};

export default function ScoreboardPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="max-w-xl font-stencil text-3xl tracking-stencil text-bone sm:text-4xl">
        How fast the market noticed
      </h1>

      <div className="mt-4 inline-flex items-center gap-2 rounded-[2px] border border-hold/40 bg-hold-soft px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-hold">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-hold" aria-hidden />
        Analytics only — never connected to slashing or the challenge bond.
      </div>

      <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-bone-muted">
        For every posted registry event, the time it went on-chain against the first moment
        its OKX index price moved at least 0.50% from its own pre-post baseline — read
        directly from the P0.8 index poller, served by a small read-only API on the VPS. The
        0.50% threshold is an explicitly provisional value; see the pre-registered method for
        its justification and revisit trigger.
      </p>

      <ScoreboardTable />
    </div>
  );
}
