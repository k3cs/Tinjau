import { DEFENSE_ROWS } from "@/lib/product/system";

export function DefenseComparison() {
  return (
    <section className="section-rule bg-paper-bright" aria-labelledby="defense-title">
      <div className="mx-auto max-w-[1440px] px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="max-w-3xl">
          <p className="data-label text-coal-faint">One signal is not a defence</p>
          <h2
            id="defense-title"
            className="mt-4 font-display text-section-sm text-coal lg:text-section-lg"
          >
            What the usual controls miss.
          </h2>
          <p className="mt-5 max-w-[62ch] text-body-md text-coal-muted">
            An architecture comparison, not a scoreboard. The measured economic comparison{" "}
            <a href="/compare" className="underline">
              came out indeterminate
            </a>{" "}
            and is reported separately.
          </p>
        </div>
        <div className="mt-12 overflow-x-auto border-y border-black" tabIndex={0} aria-label="Architectural defense comparison; scroll horizontally on narrow screens">
          <table className="min-w-[760px] w-full border-collapse text-left">
            <thead className="font-data text-[10px] uppercase tracking-[0.06em] text-coal-muted">
              <tr>
                <th scope="col" className="py-4 pr-5 font-medium">Defense</th>
                <th scope="col" className="border-l border-black/20 px-5 py-4 font-medium">Evidence context</th>
                <th scope="col" className="border-l border-black/20 px-5 py-4 font-medium">Confirmation</th>
                <th scope="col" className="border-l border-black/20 px-5 py-4 font-medium">Action boundary</th>
              </tr>
            </thead>
            <tbody>
              {DEFENSE_ROWS.map((row) => (
                <tr key={row.name} className={row.name === "Tinjau design" ? "bg-signal/20" : "border-t border-black/20"}>
                  <th scope="row" className="py-5 pr-5 text-sm font-semibold">{row.name}</th>
                  <td className="border-l border-black/20 px-5 py-5 text-sm text-coal-muted">{row.context}</td>
                  <td className="border-l border-black/20 px-5 py-5 text-sm text-coal-muted">{row.confirmation}</td>
                  <td className="border-l border-black/20 px-5 py-5 text-sm text-coal-muted">{row.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
