import { DEFENSE_ROWS } from "@/lib/product/system";

export function DefenseComparison() {
  return (
    <section className="section-rule bg-paper-bright" aria-labelledby="defense-title">
      <div className="mx-auto max-w-[1440px] px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="max-w-3xl">
          <p className="font-data text-[10px] font-semibold uppercase tracking-[0.08em] text-coal-muted">Defense is not one signal</p>
          <h2 id="defense-title" className="mt-4 font-display text-4xl font-bold tracking-display sm:text-5xl">What existing controls miss.</h2>
          <p className="mt-5 max-w-[68ch] leading-7 text-coal-muted">This is an architecture comparison, not a benchmark result. Economic outcomes remain closed until the preregistered replay runs.</p>
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
