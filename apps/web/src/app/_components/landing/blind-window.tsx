import { BLIND_WINDOW } from "@/lib/product/system";

export function BlindWindow() {
  return (
    <section className="section-rule bg-paper" aria-labelledby="blind-window-title">
      <div className="mx-auto max-w-[1440px] px-4 py-24 sm:px-6 lg:px-8 lg:py-32">
        <div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]">
          <div>
            <p className="font-data text-[10px] font-semibold uppercase tracking-[0.08em] text-coal-muted">The blind window</p>
            <h2 id="blind-window-title" className="mt-4 max-w-xl font-display text-4xl font-bold leading-tight tracking-display sm:text-5xl">
              The pool sees the trade. It does not see why the trade arrived.
            </h2>
          </div>
          <div className="border-t border-black">
            <ol>
              {BLIND_WINDOW.map((step, index) => (
                <li key={step.time} className="grid grid-cols-[4rem_1fr] gap-4 border-b border-black/20 py-5 sm:grid-cols-[6rem_0.7fr_1.3fr]">
                  <span className="font-data text-xs font-semibold">{step.time}</span>
                  <span className="text-sm font-semibold">{step.title}</span>
                  <span className="col-start-2 text-sm leading-relaxed text-coal-muted sm:col-start-auto">{step.detail}</span>
                  {index === 2 && <span className="col-span-full mt-2 border-l-2 border-watch bg-watch/10 px-4 py-3 font-data text-[11px] font-semibold uppercase tracking-[0.06em] text-coal">Context gap</span>}
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  );
}
