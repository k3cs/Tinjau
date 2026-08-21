import { INTEGRATION_PATHS } from "@/lib/product/integrations";
import { IntegrationBoundary } from "./integration-boundary";

export function IntegrationPaths() {
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-20 sm:px-6 lg:px-8 lg:py-28" aria-label="Integration paths">
      <div className="grid gap-10 lg:grid-cols-[14rem_1fr]">
        <nav aria-label="Developer roles" className="lg:sticky lg:top-24 lg:self-start">
          <p className="font-data text-[10px] uppercase tracking-[0.06em] text-ink-muted">Choose your role</p>
          <ol className="mt-4 border-t border-edge">
            {INTEGRATION_PATHS.map((path) => <li key={path.id} className="border-b border-edge"><a href={`#${path.id}`} className="flex min-h-12 items-center px-3 text-sm font-semibold transition-colors duration-150 ease-tinjau hover:bg-surface hover:text-ink">{path.audience}</a></li>)}
          </ol>
        </nav>
        <div className="border-t border-edge">
          {INTEGRATION_PATHS.map((path) => (
            <article key={path.id} id={path.id} className="scroll-mt-24 border-b border-edge py-10 first:pt-8">
              <div className="grid gap-6 lg:grid-cols-[0.45fr_1fr]">
                <div><p className="font-data text-[10px] uppercase tracking-[0.06em] text-ink-muted">{path.audience}</p><h2 className="mt-3 font-display text-3xl font-bold tracking-display">{path.title}</h2><p className="mt-4 text-sm leading-relaxed text-ink-muted">{path.outcome}</p></div>
                <ol className="border-t border-edge">
                  {path.steps.map((step, index) => <IntegrationBoundary key={step.title} step={step} index={index + 1} />)}
                </ol>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
