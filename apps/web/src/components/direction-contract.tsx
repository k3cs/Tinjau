/**
 * Impeccable direction contract (new-work.md section 5), emitted as a literal HTML
 * comment — an ordinary JSX comment compiles away and never reaches the DOM, so a
 * build-audit grep for the seed key would find nothing. `dangerouslySetInnerHTML` on a
 * zero-footprint, aria-hidden wrapper is the only way React can put a real HTML comment
 * node in the markup. Rendered as the first child of <body> in the root layout.
 */
const CONTRACT = `
DIRECTION CONTRACT (impeccable new-work, seed key c093dccb)
THESIS: Tinjau is a customs house for corporate disclosure — every filing is held,
inspected, and released as bonded cargo, never asserted as a headline. Refuses the
glowing-stat-card crypto-dashboard default.
OWN-WORLD: a warehouse dock at night — warm graphite ground (#17140F), kraft-tag manifest
cards (#C69A5B) with die-cut notches, stamp inks reserved one-per-meaning (clearance teal
= verified, duty red = disputed, hold amber = pending). Allerta Stencil for crate-stencil
headlines, Archivo for body, Roboto Mono for every tracking number, address, and hash.
Raised by: alert-color discipline (VU-meter bridge challenger — stamp ink never
decorates, only states); chrome-deleted typographic honesty (Metro tiles challenger — no
gradients, no card bezels standing in for content); measured-state-over-animation
(blacksmith-forge challenger — every state shown as exact before/after figures, not
dramatized).
STORY: a holder or judge lands on a real cargo tag mid-inspection (event id 1, live),
reads its stamps and initials as the three-parse agreement, understands the bond and
dispute window, and moves to look up their own address or the forward schedule.
FIRST VIEWPORT: the dock floor itself, the one real manifest tag inspected at scale, IN
BOND stamp disclosing testnet, tracking number as source hash + tx link, stencilled
lookup panel beside it as the primary action — no hero-metric template.
FORM: bonded-warehouse / customs-manifest world, assigned index 3 of 7 grounded
directions, seed key c093dccb.
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
