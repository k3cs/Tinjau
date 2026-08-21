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
 * Internal document pointers, rewritten at the boundary.
 *
 * The backend handoff is written for people who have the planning documents
 * open, so its strings cite them: "T0.4 §5", "per tracker §1's claim gate",
 * "See api-contract.md §4". Those files are in the public repository and the
 * references are not broken, but on a web page they are unreadable: a visitor
 * gets an identifier with no link, no context and no way to know what it names.
 *
 * So the identifiers are translated into what they actually are, rather than
 * deleted. "T0.4" is the pre-registered benchmark method, and a sentence saying
 * the pre-registered method records something is the same sentence with the
 * filing cabinet removed. Bare pointers that carry no clause of their own are
 * dropped, because a parenthetical citation to a document the reader is not
 * holding adds nothing they can use.
 *
 * This never removes a qualification. Every rewrite below either preserves the
 * clause or removes a pure cross-reference, which is why the substitutions are
 * spelled out one by one instead of a single regex that eats "§" and hopes.
 */
const DOC_ALIASES: Array<[RegExp, string]> = [
  // Whole cross-reference sentences: nothing survives them but the pointer.
  [/\s*See\s+[a-z0-9-]+\.md(?:\s*§\s*\d+(?:\.\d+)*)?\.?/gi, ""],
  [/\s*\(see\s+[a-z0-9-]+\.md(?:\s*§\s*\d+(?:\.\d+)*)?\)/gi, ""],

  // Named documents, replaced by what they are.
  [/\(\s*T0\.4\s*§\s*\d+(?:\.\d+)*\s*\)/g, "(per the pre-registered method)"],
  [/\bT0\.4(?:'s)?\s*§\s*\d+(?:\.\d+)*/g, "the pre-registered method"],
  [/\bT0\.4's\b/g, "the pre-registered method's"],
  [/\bT0\.4\b/g, "the pre-registered method"],
  [/\bT0\.2's\b/g, "the frozen-scenario record's"],
  [/\bT0\.2\b/g, "the frozen-scenario record"],
  [/\btracker\s*§\s*\d+(?:\.\d+)*'s\b/gi, "the pre-registered"],
  [/\btracker\s*§\s*\d+(?:\.\d+)*/gi, "the pre-registered rules"],

  // A whole sentence that opens with a task id is bookkeeping about which
  // internal task owns which computation, and carries nothing a reader can use.
  // This has to run before the inline rule below, which would otherwise strip
  // the id and leave the sentence dangling ("owns that; ... stop at the rows").
  [/(?:^|(?<=\.)\s*)T\d\.\d[^.]*\.\s*/g, ""],

  // Paired and bare-phase ids. "the frozen T1.2/T3.3 versions" already names
  // what they are in the clause before it, and "before any T5 result existed"
  // means the benchmark phase.
  [/\bT\d\.\d\/T\d\.\d\s+/g, ""],
  [/\bT\d\s+result\b/g, "benchmark result"],

  // Task identifiers inside prose. The id is the filing-cabinet label and the
  // words after it are the actual content, so "(T1.2 promotion, T2.3 evidence
  // graph)" becomes "(promotion, evidence graph)" rather than being deleted
  // whole. A trailing id in a list ("T3.3, published") is a pure citation.
  [/\bT\d\.\d\s+(?=[a-z])/g, ""],
  [/\bT\d\.\d,\s*/g, ""],
  [/\s*\(T\d\.\d\)/g, ""],

  // Bare section pointers carrying no clause of their own.
  //
  // The numeric token is anchored with (?![\d.]) so it cannot match a prefix of
  // its own number: without it, "§0.12 X Layer" lost "§0" to a lookahead that
  // saw the "." of ".12" as sentence punctuation and left "The.12".
  [/\s*\(§\s*\d+(?:\.\d+)*\)/g, ""],
  [/\s*§\s*\d+(?:\.\d+)*(?![\d.])\s*(?=[.,;])/g, ""],
  [/\bThe\s+§\s*\d+(?:\.\d+)*(?![\d.])\s+/g, "The "],
  [/\s*§\s*\d+(?:\.\d+)*(?![\d.])/g, ""],
];

export function stripInternalRefs(text: string): string {
  let out = text;
  for (const [pattern, replacement] of DOC_ALIASES) out = out.replace(pattern, replacement);
  // The removals can leave doubled spaces or a space before punctuation.
  return out.replace(/\s{2,}/g, " ").replace(/\s+([.,;:])/g, "$1").trim();
}

/**
 * Applies `houseStyle` and `stripInternalRefs` to every string in a parsed JSON
 * value, keys included, returning a new structure. Non-string leaves pass through untouched, so no
 * number, boolean, hash or address can be altered on the way to the screen.
 */
export function deepHouseStyle<T>(value: T): T {
  if (typeof value === "string") return stripInternalRefs(houseStyle(value)) as unknown as T;
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
