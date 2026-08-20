/**
 * Impeccable direction contract (new-work.md section 5), emitted as a literal HTML
 * comment — an ordinary JSX comment compiles away and never reaches the DOM, so a
 * build-audit grep for the seed key would find nothing. `dangerouslySetInnerHTML` on a
 * zero-footprint, aria-hidden wrapper is the only way React can put a real HTML comment
 * node in the markup. Rendered as the first child of <body> in the root layout.
 */
const CONTRACT = `
DIRECTION CONTRACT (impeccable new-work, seed key 397a5fab)
THESIS: Tinjau makes the boundary between evidence, authorization, and action inspectable;
it refuses the generic DeFi dashboard that reduces risk to disconnected metric cards.
OWN-WORLD: OKX black and white, electric-lime interaction energy, strict semantic state
colors, hairline circuit paths, square control surfaces, and dense but calm financial type.
STORY: a judge sees the current risk state, follows the evidence and market confirmation
that caused it, verifies the bounded action, then compares the same event under three
policies.
FIRST VIEWPORT: a compact command bar tops a 12-column field: dominant state and reason at
left, market confirmation at center, protection envelope at right, with one evidence-to-
policy circuit continuing below the fold.
FORM: circuit-breaker control room, candidate 5 of the grounded operational directions,
seed key 397a5fab.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish
review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.
`;

export function DirectionContract() {
  return (
    <div
      aria-hidden
      style={{ display: "none" }}
      dangerouslySetInnerHTML={{ __html: `<!--${CONTRACT}-->` }}
    />
  );
}
