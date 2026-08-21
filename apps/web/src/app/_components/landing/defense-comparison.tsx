import { DEFENSE_ROWS } from "@/lib/product/system";

/**
 * An architecture comparison, and only that.
 *
 * Every cell is one or two words on purpose. A longer cell would read as a
 * scoreboard, and the measured comparison came out indeterminate, so a
 * scoreboard is exactly the thing this table must not become.
 */
export function DefenseComparison() {
  return (
    <section className="section-rule bg-canvas" aria-labelledby="defense-title">
      <div className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-2xl">
          <p className="data-label text-ink-faint">One signal is not a defence</p>
          <h2
            id="defense-title"
            className="scroll-mt-28 mt-4 font-display text-section-sm text-ink lg:text-section-lg"
          >
            What the usual controls miss.
          </h2>
          <p className="mt-5 max-w-[48ch] text-body-md text-ink-muted">
            Shapes of design, not a scoreboard. The measured economics{" "}
            <a href="/proof" className="text-signal underline underline-offset-4">
              came out indeterminate
            </a>
            .
          </p>
        </div>
        <div
          className="mt-10 overflow-x-auto border-y border-edge"
          tabIndex={0}
          aria-label="Architectural defense comparison; scroll horizontally on narrow screens"
        >
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="data-label text-ink-faint">
              <tr>
                <th scope="col" className="py-4 pr-5 font-medium">
                  Defence
                </th>
                <th scope="col" className="border-l border-edge px-5 py-4 font-medium">
                  Knows why
                </th>
                <th scope="col" className="border-l border-edge px-5 py-4 font-medium">
                  Second opinion
                </th>
                <th scope="col" className="border-l border-edge px-5 py-4 font-medium">
                  Bounded
                </th>
              </tr>
            </thead>
            <tbody>
              {DEFENSE_ROWS.map((row) => (
                <tr
                  key={row.name}
                  className={
                    row.name === "Tinjau design" ? "bg-signal/[0.09]" : "border-t border-edge"
                  }
                >
                  <th scope="row" className="py-5 pr-5 text-body-sm font-semibold text-ink">
                    {row.name}
                  </th>
                  <td className="border-l border-edge px-5 py-5 text-body-sm text-ink-muted">
                    {row.context}
                  </td>
                  <td className="border-l border-edge px-5 py-5 text-body-sm text-ink-muted">
                    {row.confirmation}
                  </td>
                  <td className="border-l border-edge px-5 py-5 text-body-sm text-ink-muted">
                    {row.action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
