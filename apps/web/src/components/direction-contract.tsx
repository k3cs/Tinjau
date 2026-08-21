/**
 * Impeccable direction contract (new-work.md section 5), emitted as a literal HTML
 * comment — an ordinary JSX comment compiles away and never reaches the DOM, so a
 * build-audit grep for the seed key would find nothing. `dangerouslySetInnerHTML` on a
 * zero-footprint, aria-hidden wrapper is the only way React can put a real HTML comment
 * node in the markup. Rendered as the first child of <body> in the root layout.
 */
const CONTRACT = `
DIRECTION CONTRACT (impeccable new-work, seed key 397a5fab)
THESIS: Tinjau is introduced as a complete LP safety system before the browser traces one
event across intake, evidence, policy, market confirmation, registry, action, communication,
and recovery.
OWN-WORLD: OKX black and white, warm editorial paper, electric-lime interaction energy,
strict semantic state colors, hairline system paths, square controls, and compact financial
typography.
STORY: a judge learns the blind-window problem, sees which module closes each gap, then runs
three scenes that distinguish rumor containment, conditional protection, and matched-input
policy comparison.
FIRST VIEWPORT: an asymmetric product statement sits beside a factual system schematic; the
primary action starts the guided three-scene demo.
FORM: industrial/utilitarian with editorial pacing; landing report plus operational demo.
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
