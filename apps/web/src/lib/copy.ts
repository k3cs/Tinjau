/**
 * House style applied to prose this lane does not own.
 *
 * The em dash (U+2014) is ruled out of Tinjau's writing everywhere. That is easy
 * to enforce in components, which `test/writing-rules.test.ts` scans, and it is
 * not enforceable at all in the backend handoff, which is read-only to this lane
 * and does use em dashes. One of them reached production on `/compare` for
 * exactly that reason: the sweep looked at components and the sentence was
 * living in `three-policy-comparison.json`.
 *
 * So the rule moves to the boundary. Every string that crosses from the handoff
 * into the UI goes through `houseStyle`, and `deepHouseStyle` applies it to a
 * whole parsed artifact once, at module load, so no call site can forget.
 *
 * The rewrite is not a deletion. A single dash introducing a clause that runs to
 * the end of the sentence becomes a parenthesis, which is the form this project
 * uses for an aside; anything else becomes a comma. Both preserve the clause,
 * which matters because these strings are the backend's own qualifications and
 * dropping half of one would be an overclaim by punctuation.
 */
/** Built from the code point so this file does not contain what it removes. */
const EM_DASH = String.fromCharCode(0x2014);

export function houseStyle(text: string): string {
  const count = text.split(EM_DASH).length - 1;
  if (count === 0) return text;

  // A pair of dashes is a parenthetical interruption, not an aside at the end,
  // so commas are the only rewrite that keeps the sentence grammatical. Trying
  // the parenthesis rule on the second dash of a pair produces nonsense.
  if (count === 1) {
    const asAside = text.replace(
      new RegExp(`\\s*${EM_DASH}\\s*(.+?)([.!?])(\\s*)$`),
      " ($1)$2$3",
    );
    if (asAside !== text) return asAside;
  }

  return text.replace(new RegExp(`\\s*${EM_DASH}\\s*`, "g"), ", ");
}

/**
 * Applies `houseStyle` to every string in a parsed JSON value, keys included,
 * returning a new structure. Non-string leaves pass through untouched, so no
 * number, boolean, hash or address can be altered on the way to the screen.
 */
export function deepHouseStyle<T>(value: T): T {
  if (typeof value === "string") return houseStyle(value) as unknown as T;
  if (Array.isArray(value)) return value.map((item) => deepHouseStyle(item)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      out[key] = deepHouseStyle(item);
    }
    return out as unknown as T;
  }
  return value;
}
