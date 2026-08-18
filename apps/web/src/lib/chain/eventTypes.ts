/**
 * On-chain `EventType` uint8 enum, mirrored from
 * `apps/server/src/chain/mapEventToRegistry.ts`'s `ON_CHAIN_EVENT_TYPE` export.
 */
export const ON_CHAIN_EVENT_TYPE = {
  Unknown: 0,
  Form8K_Material: 1,
  Form8K_Earnings: 2,
  Form8K_Restatement: 3,
  Form8K_ExecutiveChange: 4,
  Form8K_Bankruptcy: 5,
  Form8K_MAndA: 6,
  Form8K_Delisting: 7,
  Form4_InsiderBuy: 8,
  Form4_InsiderSell: 9,
} as const;

const LABELS: Record<number, string> = {
  0: "Unclassified",
  1: "8-K — Material Event",
  2: "8-K — Earnings",
  3: "8-K — Restatement",
  4: "8-K — Executive Change",
  5: "8-K — Bankruptcy",
  6: "8-K — M&A",
  7: "8-K — Delisting",
  8: "Form 4 — Insider Buy",
  9: "Form 4 — Insider Sell",
};

export function eventTypeLabel(eventType: number): string {
  return LABELS[eventType] ?? `Unknown (${eventType})`;
}

/** Manifest-style short code, used where space is tight (tags, list rows). */
const CODES: Record<number, string> = {
  0: "UNCL",
  1: "8-K.MAT",
  2: "8-K.ERN",
  3: "8-K.RES",
  4: "8-K.EXC",
  5: "8-K.BKR",
  6: "8-K.M&A",
  7: "8-K.DLS",
  8: "F4.BUY",
  9: "F4.SELL",
};

export function eventTypeCode(eventType: number): string {
  return CODES[eventType] ?? `UNK.${eventType}`;
}
