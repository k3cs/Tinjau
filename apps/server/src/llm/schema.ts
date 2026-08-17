/**
 * Zod schemas for LLM structured output (tasks P1.3 and P1.5).
 *
 * Two schemas live here, and they are kept deliberately unrelated in the type system —
 * neither extends nor shares a base interface with the other beyond plain filing
 * metadata. This is on purpose: `BondedFilingFieldsSchema` describes the factual fields
 * that get diffed three ways (P1.4) and are eventually bonded on-chain, while
 * `SeverityGradeSchema` is unbonded model judgment (spec §3: "the severity/direction
 * grade is unbonded model judgment... do not describe the grade as bonded"). Keeping
 * them structurally separate in code — not just documented as separate — is a
 * requirement from task P1.5, not a style preference.
 */

import { z } from "zod";
import { TRACKED_TICKERS } from "../config/tickers.js";

const TOKEN_SYMBOLS = TRACKED_TICKERS.map((t) => t.tokenSymbol) as [string, ...string[]];

/**
 * Event type vocabulary. Kept as a closed enum (rather than free-text) deliberately:
 * P1.4's field-by-field diff treats an event-type mismatch as a key-field disagreement,
 * and free text would make "8-K material agreement" vs "material agreement disclosure"
 * register as a spurious disagreement between three parses of the identical filing.
 * "other" is the deliberate escape hatch for anything genuinely uncategorizable.
 */
export const EVENT_TYPES = [
  "dividend_declaration",
  "dividend_payment",
  "stock_split",
  "insider_transaction",
  "earnings_announcement",
  "material_agreement",
  "executive_change",
  "capital_raise",
  "acquisition_or_divestiture",
  "bankruptcy_or_restructuring",
  "restatement",
  "other",
] as const;

export const FUTURE_DATE_KINDS = [
  "dividend_record_date",
  "dividend_payment_date",
  "split_effective_date",
  "earnings_announcement",
  "other",
] as const;

/** One numeric amount declared in the filing (dividend per share, deal value, shares transacted, etc). */
const DeclaredAmountSchema = z.object({
  label: z
    .string()
    .describe('What this amount is, e.g. "dividend per share", "aggregate transaction value", "shares transacted"'),
  value: z.number().describe("The numeric amount itself, no currency symbols or commas"),
  unit: z
    .string()
    .nullable()
    .describe('Unit if applicable, e.g. "USD", "USD per share", "shares" — null if unitless/unclear'),
});

/** One date the filing announces for the future (feeds the separate forward-calendar feature). */
const FutureAnnouncedDateSchema = z.object({
  kind: z.enum(FUTURE_DATE_KINDS),
  date: z.string().describe("ISO 8601 date (YYYY-MM-DD) the filing announces for a future occurrence"),
  description: z.string().describe("Brief plain-text description of what happens on this date"),
});

/**
 * The bonded factual fields extracted from one filing (task P1.3).
 * This is the schema passed to `generateObject` for each of the three independent parses.
 */
export const BondedFilingFieldsSchema = z.object({
  eventType: z.enum(EVENT_TYPES).describe("The single best-fitting category for this filing's primary event"),
  effectiveDates: z
    .array(z.string())
    .min(1)
    .describe(
      "One or more ISO 8601 dates (YYYY-MM-DD) on which the event described in this filing took or takes effect. " +
        "Use the filing's own reported date if no other effective date is stated.",
    ),
  declaredAmounts: z
    .array(DeclaredAmountSchema)
    .describe("Numeric amounts declared in the filing, if any. Empty array if the filing declares no amounts."),
  affectedToken: z
    .enum(TOKEN_SYMBOLS)
    .describe("Which tracked tokenised-equity symbol this filing's event concerns"),
  futureAnnouncedDates: z
    .array(FutureAnnouncedDateSchema)
    .describe(
      "Dates announced in this filing for future events — dividend record/payment dates, split effective " +
        "dates, announced earnings times. Empty array if the filing announces no future dates.",
    ),
  summary: z.string().describe("One or two plain-English sentences summarizing the event, for human review"),
});

export type BondedFilingFields = z.infer<typeof BondedFilingFieldsSchema>;

/**
 * Severity/direction grade (task P1.5) — UNBONDED model judgment, kept structurally
 * separate from BondedFilingFields. Never merge this schema into the bonded one.
 */
export const SeverityGradeSchema = z.object({
  severity: z
    .enum(["NORMAL", "ELEVATED", "GRAVE"])
    .describe("NORMAL: routine disclosure. ELEVATED: notable but not extraordinary. GRAVE: major/unusual event."),
  direction: z
    .enum(["positive", "negative", "unclear"])
    .describe("The likely directional market implication of this event for the affected token, if any"),
  rationale: z.string().describe("One or two sentences explaining the severity/direction call"),
});

export type SeverityGrade = z.infer<typeof SeverityGradeSchema>;
