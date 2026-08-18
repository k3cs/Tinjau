/**
 * Static instrument list for the OKX index-price poller (task P0.8).
 *
 * Only the two tokens with live on-chain reference pools right now (wNVDAx, wMSTRx) —
 * the other underlyings in the spec are not yet trading and are deliberately not listed
 * here; add a row once a real on-chain address exists for it.
 */

export interface IndexInstrument {
  instrument: string;
  chain: string;
  address: `0x${string}`;
}

export const INDEX_INSTRUMENTS: IndexInstrument[] = [
  { instrument: "wNVDAx", chain: "xlayer", address: "0xa8ddb5cd96b5222afe198316e9a57caa642850d5" },
  { instrument: "wMSTRx", chain: "xlayer", address: "0x30987adf0b11dc698438a99ba04ec3a1ab2c7eab" },
];
