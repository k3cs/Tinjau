import { ForwardCalendar } from "@/components/forward-calendar";
import { TRACKED_TOKENS } from "@/lib/chain/tokenAddresses";

export const metadata = {
  title: "Forward Calendar — Tinjau",
};

export default function CalendarPage() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="max-w-xl font-stencil text-3xl tracking-stencil text-bone sm:text-4xl">
        What&apos;s scheduled, already extracted from filings
      </h1>
      <p className="mt-4 max-w-xl text-[14px] leading-relaxed text-bone-muted">
        Dividend record and payment dates, split effective dates, and announced earnings times — every
        future-dated field a posted filing declared, for {TRACKED_TOKENS.map((t) => t.symbol).join(" and ")}
        , read directly from the registry.
      </p>
      <ForwardCalendar />
    </div>
  );
}
