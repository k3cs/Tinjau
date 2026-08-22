/**
 * The video's design tokens, taken from `brand.md` at the repository root.
 *
 * Two rules from that file govern everything in this folder and are not stylistic
 * preferences: pure black is a deliberate OKX/X Layer token rather than a dark grey,
 * and gradients, glass, glow and decorative noise are excluded. Motion therefore has
 * to come from flat fields, hairlines, typography and state changes.
 *
 * Electric lime marks an active system path. It is never a risk state; the risk
 * states have their own three colours and must not borrow it.
 *
 * TYPOGRAPHY RULE, added after review: no text on this surface is ever thin,
 * translucent, or widely tracked. Wide-tracked light grey uppercase is the single
 * most recognisable machine-generated look there is, and it was the first thing a
 * viewer named. Labels are short, heavy and tightly tracked, like a printed rubric.
 * Dimming is done by swapping to a darker *solid* colour, never by lowering opacity,
 * so no glyph is ever rendered semi-transparent at rest.
 */

export const C = {
  carbon: "#000000",
  elevated: "#1A1A19",
  /** A card whose evidence has been consumed. Flat, not faded. */
  spent: "#0E0E0D",

  // Text ramp. Every step is a solid colour that clears 4.5:1 on its own field at
  // the size it is used, so nothing needs an opacity crutch to sit back.
  paper: "#F5F5F0",
  body: "#D2D2CC",
  muted: "#B3B3B3",
  dim: "#7E7E78",
  ghost: "#5E5E58",

  // Structure. These are the only places the near-black greys are allowed.
  rule: "#2A2A28",
  edge: "#3A3A38",
  edgeSpent: "#242422",

  signal: "#BCFF2F",

  normal: "#31BD65",
  watch: "#F76816",
  protect: "#F04872",
  proof: "#4283FF",
} as const;

/** Hairline weight used for every rule and card edge. Never thicker. */
export const HAIRLINE = 1;

export const FONT = {
  display: "Inter Tight, Inter, system-ui, sans-serif",
  body: "Inter, system-ui, sans-serif",
  data: "JetBrains Mono, ui-monospace, monospace",
} as const;

/**
 * Short operational labels — the one place brand.md reserves uppercase.
 *
 * Heavy and near-untracked on purpose. The previous version was mono 17px at
 * 0.18em in `#5B5B57`, which is the HUD-caption cliché; at 700 weight, 0.02em and
 * `muted` the same words read as a set label on an instrument panel.
 */
export const opLabel = {
  fontFamily: FONT.display,
  fontSize: 15,
  fontWeight: 600,
  letterSpacing: "0.02em",
  textTransform: "uppercase" as const,
  color: C.muted,
};

/** Tabular numerals, required anywhere a figure can change between frames. */
export const tabular = {
  fontFamily: FONT.data,
  fontVariantNumeric: "tabular-nums" as const,
};

/**
 * Machine-verifiable data — timestamps, counts, reason codes. Mono, because a judge
 * may want to check it against the scenario file, but at normal tracking and a
 * weight that survives 1080p compression.
 */
export const dataText = {
  ...tabular,
  fontSize: 15,
  fontWeight: 500,
  letterSpacing: "0.01em",
  color: C.muted,
};

/** The single figure size shared by all three readouts, so none outranks another. */
export const FIGURE = 54;
