# U1–U5 Verification Results

- Date: 2026-08-16
- Outcome: **four resolved, one out of my hands.** One result inverts an earlier conclusion of mine and vindicates a claim of Fable's I had rejected.

## U0 — The inversion, stated first

`[Fakta]` **xStocks are live on X Layer today, with real DEX liquidity.** Verified on-chain against chain 196, and cross-checked through OKX's own token API:

| Token | Name | Holders | DEX liquidity | Market cap |
|---|---|---|---|---|
| NVDAx | NVIDIA xStock | 1,627 | $478,411 | $6,259,344 |
| AAPLx | Apple xStock | 777 | $289,885 | $5,914,414 |
| GOOGLx | Alphabet xStock | 542 | $298,578 | $5,656,146 |
| TSLAx | Tesla xStock | 220 | $659,544 | $4,892,968 |
| SPYx | SP500 xStock | 173 | $569,045 | $6,248,775 |
| METAx | Meta xStock | 113 | $314,834 | $5,713,116 |
| SNDKx | Sandisk xStock | 97 | $271,738 | $10,191,471 |
| MSTRx | MicroStrategy xStock | 90 | $294,092 | $6,511,283 |
| CRCLx | Circle xStock | 85 | $213,354 | $4,786,958 |
| COINx | Coinbase xStock | 34 | $200,875 | $5,528,187 |
| AMZNx | Amazon xStock | 24 | $195,750 | $6,269,206 |

`[Fakta]` Direct on-chain read of `0xc845b2894dbddd03858fd2d643b4ef725fe0849d` on X Layer returns `name = "NVIDIA xStock"`, `symbol = "NVDAx"`, `decimals = 18`, `totalSupply = 27,802.2334`, 2,138 bytes of code.

`[Fakta]` Roughly **$3.8M of DEX liquidity across ~$68M of market cap and 3,800+ holders**, on X Layer.

**This makes `outputs/01-research/xlayer-rwa-reality-check.md` and REF-011 wrong.** `[Inferensi]` My error had two causes, both the same mistake in different clothes. DeFiLlama has no "RWA" protocol on X Layer because it classifies *protocols*, and tokens sitting in DEX pools are counted under the DEX. And xstocks.com's supported-chain list is marketing copy that lags deployment. I treated the absence of a label as the absence of the thing.

`[Inferensi]` Consequences: Fable's claim that *"every probe is a real X Layer transaction"* was **correct** and I rejected it wrongly. The Path A / Path B fork was a false dilemma I manufactured. And EXITPROOF has native X Layer subject matter today.

`[Inferensi]` The exit question is live and unanswered on exactly these assets. SNDKx carries $271,738 of liquidity against a $10,191,471 market cap — **2.7%**. AMZNx is 3.1%. A holder of $500k of SNDKx cannot exit near the quoted price, and nothing publishes that. Because xStocks are backed 1:1 by custodied shares, the exit question splits cleanly into DEX exit (liquidity) and issuer redemption (backing) — which is precisely EXITPROOF's two-dimension design, with both dimensions now native to X Layer.

## U1 — OndoIDRegistry whitelist turnaround

**Status: cannot be done by me. Partially de-risked.**

`[Inferensi]` Registering requires creating an account and submitting identity documents at app.ondo.finance. Both are outside what I will do on Dien's behalf. This one is his to run.

What I could verify instead:

`[Fakta]` The registry is actively processing. `setUserID` calls on `0xcf6958D69d535FD03BD6Df3F4fe6CDcd127D97df`, from the 50 most recent transactions: 2026-08-11: 3 · 08-12: 8 · 08-13: 13 · 08-14: 11 · 08-15: 15. All `status=ok`, spread across each day at roughly three-hour intervals.

`[Fakta]` The call signature is `setUserID(address rwaToken, address[] userAddresses, bytes32 newUserID)`. Calls come in pairs per user, so ~10 transactions/day is roughly **5 new users onboarded per day, continuously**.

`[Inferensi]` This is a live retail pipeline, not a dormant institutional process. It does not prove turnaround, but it rules out the worst case of a queue nobody is servicing.

**Self-check Dien can run, no account needed.** After applying, call `getRegisteredID` on the registry — non-zero means registered:

```bash
curl -s -X POST https://eth.drpc.org -H 'content-type: application/json' -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"0xcf6958D69d535FD03BD6Df3F4fe6CDcd127D97df","data":"0x7f190771'"$(printf '%064s' 96f6ef951840721adbf46ac996b59e0235cb985c | tr ' ' 0)$(printf '%064s' YOUR_ADDRESS_NO_0X | tr ' ' 0)"'"},"latest"]}'
```

`[Fakta]` Tested against a known-registered address, it returns `0x55534459000000003abded1cce6f192c…`; against Dien's recorded agentic wallet it returns all zeroes.

## U2 — Is `USDY_InstantManager` funded just-in-time?

**Status: resolved. My $10 headline was wrong and is retracted.**

`[Fakta]` The contract is heavily used. Its ERC-20 transfer history shows 36 USDC transfers and 14 USDY transfers in the 50 most recent records, with a **maximum USDC transfer of $1,028,032** and a median of $1,236. Most recent activity 2026-08-16.

`[Fakta]` The pattern is `USDC 0x0000…→InstantManager` immediately followed by `InstantManager→0x99B8d1D1…`, and `USDY user→InstantManager` followed by `InstantManager→0x0000…`. USDC is minted to the contract per redemption and forwarded; USDY is burned.

`[Inferensi]` So the $10.00 balance is a transient residue, **not capacity**. My reading of it as "the product's own best advertisement" was wrong and must not be used.

**The real capacity mechanism is better, and it is public.** `[Fakta]` `ondoRateLimiter()` → `0x98db502215da1ad9f626d4a0090a8a2f4971003c`. Read live for USDY:

| Quantity | Value |
|---|---|
| Global redemption limit | **$15,000,000 per 86,400s** |
| Global subscription limit | $100,000,000 per 86,400s |
| Per-user default redemption limit | $10,000,000 per 86,400s |
| Per-user default subscription limit | $50,000,000 per 86,400s |
| Redemption used in the current window | $18,902.06 |
| Redemption capacity remaining now | $15,000,000 |

`[Inferensi]` This is a strictly better datum than the balance. Exit capacity is a **structured, time-windowed, per-asset, per-user on-chain quantity** that is free to read, needs no KYC, and nobody publishes or monitors. USDY's cap is 1.5% of its $972M supply per day, so a full exit takes about 65 days at the ceiling. That is a defensible, checkable, publishable number, and it is EXITPROOF's thesis in one call.

## U3 — Event A AI-RWA track field size

**Status: not discoverable, as expected. Removed from the case.**

`[Fakta]` Event A publishes no entries gallery, and the submission form has no track selector, so track membership is assigned by the judges rather than declared.

`[Inferensi]` Any "small field" or "sole entrant" claim stays an assumption and has been struck from every scoring argument.

`[Inferensi]` The ERC-8004 marketplace is a usable proxy for competitive density instead — see U4, where it turns out to be crowded.

## U4 — Do the OKX ERC-8004 and marketplace endpoints work?

**Status: resolved. They work, and the answer is bad news for BLACKLETTER.**

`[Fakta]` `onchainos` CLI v4.4.2 is installed at `~/.local/bin/onchainos`. `agent search --query <q>` returns live structured data: agentId, `chainIndex: 196`, communication address, service endpoints, fee token, price, feedback rate, sold count, MCP endpoints, `serviceType: A2MCP`.

`[Fakta]` Fees are denominated in `0x779ded0c9e1022225f8e0630b35a9b54be713736` — the same USD₮0 that is the largest Aave V3 reserve on X Layer.

**Live agents occupying BLACKLETTER's exact territory, all on chain 196:**

- `[Fakta]` **#5516 Merita** — *"Impartial verification referee for agent work. Posters commit to a machine-checkable acc[eptance criteria]"*. That is BLACKLETTER's core mechanism, already shipped.
- `[Fakta]` **#2162 Internet Court MCP** — *"the trust layer for agent-to-agent commerce, bounded mandates, evidence, payments, review, revocation, and dispute workflows"*.
- `[Fakta]` #10367 EVIDIQ Aegis (budget limits, velocity controls, escrow validation) · #2831 Q402 (non-custodial escrow for AI agents) · #9177 Aletheia (*"one call before an agent acts"*) · #4196 AttestVerify · #6573 VRYFY · #6271 A-Identity Trust Oracle · #9579 RealityCheck.

**Live agents near EXITPROOF:**

- `[Fakta]` **#6127 Phylax** — *"autonomous portfolio risk checks for xStocks and RWA workflows before ag[ents act]"*. Adjacent, but pre-trade risk rather than exit capacity.
- `[Fakta]` #6711 Vera by Monvera (broker/analyst for tokenized stocks and RWAs) · #10625 HuaQuant (EMA trading signals over X Layer RWA tokens — the row that exposed U0).

`[Inferensi]` The endpoints behave as documented, so BLACKLETTER's integration story is technically sound. But the same query that proved it also found **two live incumbents doing BLACKLETTER's core thing on the target chain**. Its innovation score cannot survive that intact.

## U5 — OKX Agentic Wallet live state

**Status: resolved.**

`[Fakta]` The recorded EVM address `0xb98e2cd39d2448162b1d60706a5f241f76c73028` holds **zero native balance and zero transactions** on X Layer, Ethereum, Base, and Arbitrum. It has never transacted.

`[Fakta]` It is not registered in OndoIDRegistry for USDY.

`[Inferensi]` Two practical consequences. Event B requires a Base wallet holding ~$10 in ETH for the ignition fee, and this wallet has nothing. And any X Layer testnet or mainnet deployment needs OKB for gas. Both are Dien's actions, both cheap, neither blocking today.

## Net effect on Checkpoint 1

| Candidate | Before | After |
|---|---|---|
| EXITPROOF | Subject matter assumed cross-chain; capacity datum was a wrong $10 balance | **Native X Layer subject matter (11 xStocks, $3.8M liquidity); capacity is a clean public rate-limit read; nearest competitor Phylax is adjacent, not the same** |
| BLACKLETTER | Weak on innovation because of corpus saturation | **Weaker still — Merita and Internet Court MCP are live on X Layer doing its core thing.** U4 dependency cleared, but the clearance found the incumbents |
| THESEUS | Out | Out |

`[Inferensi]` Both of the two things that were holding EXITPROOF back turned out to be my own errors, and the one thing holding BLACKLETTER up turned out to be occupied. The near-tie is no longer a tie.
