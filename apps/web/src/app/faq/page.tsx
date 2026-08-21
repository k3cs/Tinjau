import type { Metadata } from "next";
import Link from "next/link";

import { FAQ } from "@/lib/product/faq";

export const metadata: Metadata = {
  title: "FAQ · Tinjau",
  description:
    "What the model does and never does, what runs today, what the benchmark found including the part that went against us, and every awkward question answered in our own words.",
};

/**
 * The questions, grouped by the seven published judging criteria.
 *
 * Two decisions here are deliberate. The groups are the criteria verbatim, so a
 * reader assessing against them does not have to translate, and the last group
 * is the awkward one: the failed benchmark, the constructed price path, the
 * fabricated rumour, the pool we control. All four are discoverable in ten
 * minutes by anyone reading the repository, and a project that lets a reviewer
 * find them first has already lost the argument about whether it can be trusted.
 *
 * Built on `<details>` rather than a JavaScript accordion. It is keyboard
 * navigable and screen-reader correct with no client bundle, and it survives
 * with JavaScript disabled, which is the state a judge's browser may well be in.
 */
export default function FaqPage() {
  return (
    <div className="bg-canvas text-ink">
      <section className="border-b border-edge px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-[1440px]">
          <p className="data-label text-ink-faint">FAQ</p>
          <h1 className="mt-4 max-w-[20ch] text-balance font-display text-section-sm text-ink lg:text-section-lg">
            The questions, including the ones we would rather not be asked.
          </h1>
          <p className="mt-6 max-w-[56ch] text-body-md text-ink-secondary">
            Grouped by the seven published judging criteria. Every answer states something you can
            check on another page here or in the repository, and the last group is the awkward one.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[15rem_1fr] lg:gap-16">
          <nav aria-label="FAQ sections" className="lg:sticky lg:top-24 lg:self-start">
            <p className="data-label text-ink-faint">Jump to</p>
            <ol className="mt-4 border-t border-edge">
              {FAQ.map((group) => (
                <li key={group.id} className="border-b border-edge">
                  <a
                    href={`#${group.id}`}
                    className="flex min-h-12 items-center text-body-sm font-medium text-ink-secondary transition-colors duration-150 hover:text-ink"
                  >
                    {group.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div>
            {FAQ.map((group) => (
              <section
                key={group.id}
                id={group.id}
                aria-labelledby={`${group.id}-title`}
                className="scroll-mt-24 border-b border-edge pb-10 pt-2 last:border-b-0 [&:not(:first-child)]:pt-12"
              >
                <h2
                  id={`${group.id}-title`}
                  className={`font-display text-heading-lg ${
                    group.id === "hard" ? "text-watch-soft" : "text-ink"
                  }`}
                >
                  {group.title}
                </h2>
                <p className="mt-2 max-w-[56ch] text-body-md text-ink-muted">{group.blurb}</p>

                <div className="mt-6 divide-y divide-edge border-y border-edge">
                  {group.items.map((item) => (
                    <details key={item.q} className="group py-1">
                      <summary className="flex cursor-pointer list-none items-start gap-4 py-4 text-body-md font-medium text-ink">
                        <span
                          aria-hidden
                          className="mt-1.5 font-data text-[12px] text-signal transition-transform duration-150 group-open:rotate-90"
                        >
                          &rsaquo;
                        </span>
                        <span className="min-w-0">{item.q}</span>
                      </summary>
                      <div className="pb-5 pl-8">
                        <p className="max-w-[70ch] text-body-sm text-ink-secondary">{item.a}</p>
                        {item.href ? (
                          <Link
                            href={item.href}
                            className="mt-3 inline-flex min-h-10 items-center gap-2 text-body-sm text-signal underline underline-offset-4"
                          >
                            {item.hrefLabel ?? "See the evidence"}
                            <span aria-hidden>&rarr;</span>
                          </Link>
                        ) : null}
                      </div>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
