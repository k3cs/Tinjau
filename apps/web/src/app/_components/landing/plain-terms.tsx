/**
 * The three words the rest of this site leans on, defined before it leans.
 *
 * Every other section here was written for someone who already knows what a
 * pool is, who is exposed when it misprices, and what "raising the fee" buys.
 * A reader who does not know those three things reads the whole page as
 * atmosphere. This strip is the cheapest possible fix: three terms, one
 * sentence each, in the plainest words that are still true, sitting between the
 * headline and the first argument that depends on them.
 *
 * It is deliberately not a glossary page and not an expandable. Hidden
 * explanation helps nobody who did not already know they needed it.
 */

const TERMS = [
  {
    term: "The pool",
    plain: "A shared pot holding two tokens. Anyone can swap against it, at a price the pot works out for itself.",
    glyph: (
      <>
        <rect x="4" y="9" width="24" height="16" rx="3" className="fill-none stroke-signal" strokeWidth="1.5" />
        <path d="M4 15h24" className="stroke-signal/50" strokeWidth="1.5" />
        <circle cx="11" cy="20" r="2.5" className="fill-signal/60" />
        <circle cx="20" cy="20" r="2.5" className="fill-signal/25" />
      </>
    ),
  },
  {
    term: "Who carries the risk",
    plain: "The people who put money into the pot. When its price is out of date, the difference comes out of them.",
    glyph: (
      <>
        <circle cx="16" cy="11" r="4" className="fill-none stroke-watch" strokeWidth="1.5" />
        <path d="M7 25c0-5 4-8 9-8s9 3 9 8" className="fill-none stroke-watch" strokeWidth="1.5" />
      </>
    ),
  },
  {
    term: "The only thing Tinjau does",
    plain: "Raises what the pot charges per swap, briefly, never past a ceiling, then puts it back on a timer.",
    glyph: (
      <>
        <path d="M4 22h7l5-11 5 7h7" className="fill-none stroke-normal" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M4 26h24" className="stroke-edge-strong" strokeWidth="1.5" strokeDasharray="3 3" />
      </>
    ),
  },
];

export function PlainTerms() {
  return (
    <section className="section-rule bg-canvas-sunken" aria-labelledby="plain-terms-title">
      <div className="mx-auto max-w-[1440px] px-4 py-14 sm:px-6 lg:px-8">
        <h2 id="plain-terms-title" className="data-label text-ink-faint">
          Three words the rest of this page uses
        </h2>

        <dl className="mt-8 grid gap-px border border-edge bg-edge md:grid-cols-3">
          {TERMS.map(({ term, plain, glyph }) => (
            <div key={term} className="bg-canvas p-6">
              <svg aria-hidden viewBox="0 0 32 32" className="h-8 w-8">
                {glyph}
              </svg>
              <dt className="mt-4 font-display text-heading-sm text-ink">{term}</dt>
              <dd className="mt-2 max-w-[38ch] text-body-sm text-ink-muted">{plain}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
