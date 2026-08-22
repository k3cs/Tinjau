# S6.3 — Outreach kit: the shortest honest pitch, three audiences

**Status: materials only. No approach has been made.** Nothing in this file has been sent,
posted, emailed, DM'd, or filed anywhere. No recipient is named anywhere in it, deliberately.
All contact is Dien's to make or not make.

Prepared 2026-08-22. Sources: `README.md` §2/§5/§9/§10, `INTEGRATION.md`,
`s4-1-competitor-survey.md`, `s6-2-xlayer-rpc-read-consistency.md`,
`s7-1-mainnet-readiness-memo.md` §4.1, `s3-1-paired-pool-preregistration.md`,
`frontend-handoff/known-limitations.md`.

Read §7 before sending any of this.

---

## 1. What this is trying to earn

One external LP, pool operator, or protocol expressing **concrete intent** to attach the hook or
read the registry. Concrete means a specific person says a specific thing they intend to do — not
"interesting, nice work".

Three separate pitches follow because the three audiences have three different blockers, and the
pool-operator one has a structural blocker the other two do not (§4).

Every pitch is written as a body with **no greeting and no signature**. Add the addressee
yourself.

---

## 2. ⚠️ PENDING — the paired-pool result is not in yet, and must be before any of this is sent

**Do not send any pitch below until this section is filled in.** Every pitch carries the marker
`[PAIRED-POOL: PENDING — §2]` at the point where the result belongs.

As of 2026-08-22, neither artifact the pre-registration binds S3.2 to exists:

- `docs/…/05-build/s3-2-paired-pool-raw.json` — **absent**
- `docs/…/05-build/s3-2-paired-pool-result.md` — **absent**

What does exist is a first attempt whose artifacts are named
`data/s3_2_paired_pool_run1_void_console.log` and `data/s3_2_paired_pool_run1_void_raw.json`.
The `void` in those filenames is the whole status: under `s3-1` §6.1 a validity-gate failure makes
a run **VOID, not a result**, and a void run has no outcome band. **No number from that log may be
quoted, characterised, or hinted at**, including here.

`[Inferensi]` A re-run appears to be in progress under a concurrent task. That is an expectation,
not a fact, and it is not a prediction of what the re-run will show.

**Fill this in like so, once `s3-2-paired-pool-result.md` exists**, copying its first line verbatim
and changing nothing:

> The paired-pool experiment resolved **`<CONFIRMS | WEAK | NULL | ADVERSE | SIGN-INDETERMINATE>`**.
> `D = <value> bps` under the primary mark, against a pre-registered CONFIRMS threshold of
> `0.50 × Δf̄`. All three marks are published; quoting the primary alone is forbidden
> (`s3-1` §7.6).

And carry these two sentences with it **whatever band it lands in**, because they are true of every
possible outcome and were fixed before the result existed (`s3-1` §8):

> The experiment is **conditional on protection already being in force** — the trigger is
> constructed, so it assumes protection rather than earning it. It says nothing about whether
> Tinjau would have protected on this event, and the published answer to that question is that it
> would not.
>
> It assumes zero flow elasticity across a 40× fee difference, exercises the fee plateau but not
> the decay curve, and runs on two builder-controlled testnet pools holding valueless mock tokens.
> A positive result is an **upper bound**, not a market result, and does not open the
> `canClaimLossAvoided` gate — that gate stays shut.

If the band is `NULL`, `ADVERSE`, `WEAK`, or `SIGN-INDETERMINATE`, it goes into the pitch at the
same length and in the same position a `CONFIRMS` would have. That is a pre-registered obligation
(`s3-1` §7.3), not a courtesy.

---

## 3. Pitch A — an LP in tokenized equities

**Blocker to be honest about up front:** an LP cannot put this to work on real capital today. There
is no mainnet registry, and X Layer's ten real tokenized-equity pools are Uniswap v3 (§4). So the
ask below is for **twenty minutes and an opinion**, not for money or a position.

### Body

Tokenized US equities keep trading after the US reference market closes and while filings land
asynchronously. A static pool policy does not adapt to that; a plain alert can arrive too late to
act on. The usual answer is a volatility-triggered fee, which reacts to the price move without
knowing whether anything actually happened.

Tinjau publishes an on-chain record per `(asset, poolId)` that answers one question: **is a
bounded, time-limited protective fee authorised right now, and until when?** Concretely, on X Layer
Testnet (chain 1952) today:

- `effectiveState(asset, poolId)` returns `(state, fee, endsAt)` over plain JSON-RPC. No API key,
  no SDK, no Tinjau software in your stack.
- The record carries `reasonBits` — a machine-readable *why* — plus a sha256 commitment over the
  primary document behind the assessment. You can check the cause, not just the verdict.
- The bound is on chain rather than in a document. `envelope()` returns base 500 pips, max 20,000
  pips, widen 3,600 s, decay 18,000 s, hard cap 21,600 s, cooldown 3,600 s. Recovery needs no
  keeper and no transaction — one demo scene ran `20,000 → 9,470 → 500` on time alone, every fee
  decoded from PoolManager's own `Swap` event, and immediate re-arming was refused on chain by the
  contract. **The enforcement in that scene is real; the price path that triggered it is
  constructed, and the canonical replay of the same event resolves to `WATCH`.**
- Expiry is applied at read time, so a lapsed protection reads `NORMAL` even though storage still
  says `PROTECT`. Nobody pays gas to retire a record.

**Cost to try: minutes of reading, and it is reading, not an integration.** `INTEGRATION.md` is the
whole kit — §1 is one `node` command against the live registry with Node 18+ and nothing else; §6
is a 60-line dependency-free consumer you can paste. There is nothing to install, deploy, sign, or
fund.

[PAIRED-POOL: PENDING — §2]

**What is not established, in the same breath:**

- **Tinjau reaches `PROTECT` on none of the four frozen replay scenarios**, at any threshold in the
  sensitivity grid. Its fee stays at base throughout every window, so its replayed economics are
  **identical to doing nothing — a tie, not a win**. `canClaimLossAvoided` is `false`.
- The `PROTECT` you can watch in the demo uses a **constructed price path on a builder-controlled
  pool**. The canonical replay of that same real 8-K resolves to `WATCH`, because its 235 bps
  drawdown retained only 13% after five minutes.
- The rumor-containment input is a **`SIMULATED`** post written in-house, not a real one.
- On markout the benchmark **cannot rank the policies**: all 27 comparable cells flip sign between
  the pre-registered basis and a post-hoc one on identical trades. The bracket spans zero.
- Testnet only. The pools hold builder-controlled mock tokens with no value. No contract here has
  had an external security review.

**What it does claim, in one sentence:** Tinjau declined to act on two large price moves because
neither had a qualifying cause, and one of them a volatility-only policy would have traded on — it
fired on the neutral control (a routine insider Form 4) at every `k` in {2, 3, 5}. **That is a
finding about restraint. It is not a demonstration that anyone's position came out ahead.**

**The ask:** read `INTEGRATION.md`, run the one command, and tell me whether the reason codes
would have changed anything you would actually have done. If the answer is no, that is the more
useful answer.

### Why this might not be for you yet

If you want a mechanism with evidence it improves LP outcomes, this does not have that evidence and
is not close to having it. Come back when there is a mainnet deployment and a result on canonical
data. If you are interested in whether a *causal* gate beats a volatility gate on false positives,
that part is measured and reproducible today.

---

## 4. Pitch B — a pool operator, and the sentence that does not exist

### Read this before pitching anyone: "attach Tinjau to your pool" is false

`[Fakta]` The ten real tokenized-equity pools on X Layer mainnet that this project measured are
**Uniswap v3** (`s7-1` §4.1; the NVDA pool answers the v3 `slot0()` selector and exposes
`feeProtocol` and `tickSpacing`).

`[Fakta]` `TinjauFeeHook` is a Uniswap **v4** hook, and in v4 the hook address is part of the
`PoolKey` and fixed at pool initialization. `TinjauFeeHook.beforeInitialize` additionally rejects
any pool not flagged dynamic-fee.

`[Inferensi]` Therefore **no existing X Layer liquidity can have this hook attached, ever** —
not the v3 equity pools (wrong protocol version), and not any already-initialized v4 pool (the
hook is immutable after initialize). "Attaching to real liquidity" can only mean creating a new v4
pool and persuading liquidity to move into it. That is business development, not a deployment
task.

**So the pool-operator pitch that most people would write does not exist, and it would collapse on
first contact with anyone who knows Uniswap.** Do not write it. Two honest offers remain, and both
are smaller.

### Offer B1 — the registry is a read-only signal source, and it is version-agnostic

The hook and the registry are separate things. **Nothing about reading the registry requires
Uniswap v4, or Uniswap at all.** A v3 pool operator, a market maker, or a router cannot attach the
hook, but can read `effectiveState(asset, poolId)` off-chain and drive their own existing controls
with it — widen their own quoted spread, pause their own routing, page a human.

The code path works today, and the offer is honest because it makes no claim about your pool's fee
mechanism. Be precise about "today" when you say it out loud: the registry exists on X Layer
**Testnet** and nowhere else, it holds records about builder-controlled pools with valueless mock
tokens, and there is no mainnet registry behind it. So this is something a counterpart can read and
evaluate now, not something they can put in front of real liquidity now. It costs the same minutes: `INTEGRATION.md` §1 (one command), §6 (plain
Node), §7 (viem). The semantics that will bite you are in §3 and they take five minutes to read.

### Offer B2 — conditional, and only if it is already true of you

If you are launching a **new** v4 pool on a tokenized equity anyway, then the hook is a candidate at
initialization time, and only then. The v4 `PoolManager` is deployed on X Layer mainnet
(`0x360e68faccca8ca495c1b759fd9eee466db9fb32`, verified live 2026-08-22). What is not there is v4
tokenized-equity liquidity to join — I searched and found none, which is "not found", not proof of
absence. **If you are not already planning a new v4 pool, B2 is not for you and I am not going to
pretend otherwise.**

### The one thing here that is worth your time regardless

`s6-2-xlayer-rpc-read-consistency.md` is a measured X Layer finding that costs you nothing to take
and has nothing to do with adopting Tinjau. X Layer Testnet's public RPC is load-balanced across
nodes at differing heights, so a read issued right after a confirmed write can be answered by a
node that lacks it and silently return the previous state. Measured 2026-08-21 over eight writes:
every one was stale on first read; reads converged after **2,519–2,746 ms** (upper bounds — the
loop polled once a second). Also: `eth_getLogs` refuses a range wider than 100 blocks. Fix: pin
reads to an explicit block number instead of `"latest"`, and follow your own emitted events instead
of polling state.

Caveats that travel with that number and must not be dropped: testnet only, no mainnet measurement
was taken; eight writes, one day, one machine; not a benchmark; the property is **episodic** and did
not reproduce on demand when probed 14 hours later; RPC behaviour can change at any time.

[PAIRED-POOL: PENDING — §2]

### What is not established, in the same breath

- Everything in §3's "not established" list applies here unchanged: no `PROTECT` on any canonical
  replay, `canClaimLossAvoided` is `false`, constructed demo price path, `SIMULATED` rumor,
  markout bracket spanning zero, testnet, unaudited.
- There is **no mainnet registry** to read. B1 is available on chain 1952 and nowhere else today.
- On testnet the assessor key is *derived* from the poster key, and the guardian is the same wallet
  as the poster. The code's own module header calls the derived key unacceptable for production.
  Both are named production blockers.
- The reference consumer in `tools/risk-reader/` was written by Tinjau. It is **not evidence that
  anyone outside this project reads the registry** — nobody outside this project is known to.

### Why this might not be for you yet

If your liquidity is in existing v3 pools — which on X Layer it almost certainly is — there is no
version of this that touches your pool's fees. B1 is real but modest, and it is a testnet read. If
that is not worth twenty minutes, that is a reasonable call and I would rather hear it than not.

---

## 5. Pitch C — a protocol taking a dependency on a risk signal

**What is available today, concretely, on X Layer Testnet (chain 1952):** a contract another
contract can read. `contracts/src/examples/ExampleRiskConsumer.sol` is a complete worked example of
one contract reading the registry from another, with its own Foundry test. Adopting it is copying
**two files** — the example, and `TinjauRiskTypes.sol`, a dependency-free library of every enum
ordinal, reason bit, and the record struct. The example declares its own minimal read-side
interface, so you pull in no EIP-712 machinery and no write function. `cd contracts && forge test`
runs from a bare clone with no setup step (145 passed, 0 failed); dependencies are vendored.

It exposes `currentRiskState()`, `shouldPause()`, `currentProtection()`, `hasBeenAssessed()`, and
`storedStateForAuditOnly()`.

**The four design decisions are the actual content, and they are the part worth reviewing:**

1. **Effective, never stored.** Every deciding view reads `effectiveState`. The stored record is
   reachable via a function named `storedStateForAuditOnly` so that misuse shows up in your diff.
   A consumer acting on `currentRecord().state` applies protection the registry no longer
   authorises — indefinitely, silently, with no transaction to show what went wrong, because a
   lapse is the absence of an event rather than an event.
2. **An undefined reason bit is refused, never masked off.** Bits 15, 23, 29, 30, 31 have no
   meaning in `tinjau.risk/1.0.0`. If a future schema gives one of them a meaning like *"the
   evidence behind this record was retracted"*, a consumer that drops unknown bits reports the
   record as though the retraction never happened, confidently, with every other field correct. A
   partially understood record is more dangerous than an unreadable one.
3. **Exact equality, never `>=`.** `shouldPause()` compares to `RiskState.Protect` exactly. A
   `state >= Watch` gate silently widens the moment a schema inserts a member, and `WATCH`
   explicitly does not authorise the aggressive path.
4. **Schema pinning at construction.** The constructor reads `schemaVersion()` once and reverts on
   mismatch, because enum ordinals and struct layout hold only within one schema version.

`assessedAt == 0` is a third answer, not a fourth state: unwritten storage decodes to `NORMAL`,
which is safe, but *"nobody ever assessed this pool"* is a different finding from *"assessed and
found normal"* — and `assessedAt` is the field separating them.

**Cost to try: minutes of reading.** `INTEGRATION.md` §3 is the semantics, §8 is the Solidity, §9
is the full read surface with 4-byte selectors you can verify with `cast sig`.

[PAIRED-POOL: PENDING — §2]

**What is not established, in the same breath:**

- **The signal has never been shown to fire correctly on real data.** Tinjau reaches `PROTECT` on
  none of the four frozen scenarios at any threshold in the grid. What is measured is the opposite
  behaviour: it declined a routine insider Form 4 that the volatility-only baseline traded on at
  every `k` in {2, 3, 5}. In other words, what has been measured is the refusal, not the firing.
- `canClaimLossAvoided` is `false`; the markout comparison brackets zero and cannot rank the
  policies.
- **This is not a price oracle.** It says what protective action is authorised. It does not say
  what anything is worth.
- Single operator, single assessor key, and on testnet that key is *derived* from the poster key.
  Unaudited — no external security review of any contract in the repository.
- Testnet only. No mainnet registry exists to depend on.
- The dual OKX/X Layer confirmation leg is `UNAVAILABLE` for all four scenarios; the X Layer pool
  leg carried confirmation alone.
- `INTEGRATION.md`, the reference consumer, and the Solidity example were all written by Tinjau.
  **An integration kit lowers the cost of adoption; it is not adoption.**
- One caveat you would meet immediately: reason bit 18, `BONDED_EVIDENCE_PASSED`, records that the
  bonded parse-agreement path passed but does not by itself distinguish a computed value from an
  assumed one. On the four frozen scenarios it was assumed. Treat bit 18 as unverified unless that
  record's writer says otherwise.

**The ask:** read `INTEGRATION.md` §3 and the four decisions above, and tell me where the semantics
break against how your system would actually consume them. A specific objection is worth more to me
than a yes.

### Why this might not be for you yet

A protocol taking a dependency on a risk signal wants evidence the signal fires when it should.
That evidence does not exist. There is no mainnet deployment, no audit, one operator, and one
signing key that is derived rather than independently generated. If you need any of those, the
answer today is no, and I would rather say so now than be found out later.

---

## 6. What is deliberately absent from all three pitches

Listed so a later edit does not quietly reintroduce them:

- Any economic benefit claim. The gate is shut and the paired-pool result cannot open it.
- Any "first", "only", "unique", or "no one else". The competitor survey explicitly licenses none
  of these; its correct verb is **"was not found"**, across 40 queries and 22 sources on
  2026-08-20/21, and that survey is stale after **2026-09-21**.
- Any framing of the constructed `PROTECT` scene as an observation.
- Any suggestion that a pool operator can add this to existing liquidity.
- Any use of the reference consumer, `INTEGRATION.md`, or the deployed testnet pools as evidence of
  adoption.

If you want the positioning sentence, it is this one and no variant of it:

> No complete public product with the exact reviewed combination of source-grounded
> tokenized-equity evidence, rumor containment, OKX/X Layer confirmation, bounded LP action,
> deterministic recovery, and measured three-policy outcome was found.

It travels with its method pointer (`s4-1-competitor-survey.md`) or not at all. One candidate,
Ondo Global Markets, is close enough that it belongs in the comparison rather than in a footnote:
it really does take bounded, deterministically-expiring on-chain action on corporate events today.
Naming that yourself is cheaper than being asked about it.

---

## 7. How to use this, and what not to say — briefing for Dien

### No approach has been made

`[Fakta]` The agent that prepared this file sent nothing, posted nothing, filed nothing, and
contacted no person or organization. No recipient is named anywhere above. Every approach is yours
to make, to whom you choose, in your own words.

### Before you send anything

1. **Fill §2.** The paired-pool result must be in, verbatim from
   `s3-2-paired-pool-result.md`, with its band stated first. If that file still does not exist,
   either delete the `[PAIRED-POOL: PENDING — §2]` markers and say nothing about the experiment, or
   wait. **Do not paraphrase the voided run.**
2. **Re-check the survey date.** `s4-1` is stale after 2026-09-21. Past that, the positioning
   sentence needs a re-run before it goes out again.
3. **Re-read §6.** It is the list of things that will be edited back in by accident.

### The sentences that must never appear, verbatim

- "Tinjau reduces LP loss"
- "Tinjau avoided *N* dollars of loss"
- "Tinjau outperformed the baselines economically"
- "dual OKX/X Layer confirmation" — for any replayed scenario
- "a replayed `PROTECT`", or any framing of the constructed scene as something observed
- "first AI dynamic-fee hook" / "first multi-agent corporate-action oracle" / "first on-chain risk
  registry" / "first CEX/DEX risk agent" / "first self-protecting pool"
- "production-ready", or anything implying production liquidity
- external adoption, protected TVL, customers, or revenue
- "a live Exchange OS integration"
- "manipulation-proof confirmation"
- "live news or social discovery", coverage, or latency

And two more that belong specifically to outreach, because this is the context where they slip in:

- **"attach Tinjau to your pool"**, to anyone with existing liquidity. It is false for every real
  tokenized-equity pool on X Layer (§4).
- **"first", "only", or "unique"** in any construction at all, including softened ones like "we
  haven't seen anyone else do this". A null result licenses none of them.

### If someone expresses interest

- **Consent first, before anything is recorded as evidence.** An expression of interest may be
  written into any artifact — score submission, README, tracker, deck — **only with that person's
  explicit permission**, and only in the form they agreed to. Ask plainly: *may I cite this, and
  under what name?*
- Without consent, it is not evidence and does not go in any file, in any anonymised or paraphrased
  form either. "An LP at a fund told me…" is still a record of a private conversation.
- **Interest is not adoption.** "This is interesting" is not concrete intent. What moves the score
  is a specific stated intention to attach the hook or read the registry, from a named party who
  agreed to be named.
- Log what actually happened, including the refusals and the non-replies. A pipeline with only
  positive entries is not a pipeline.

### The correction you will most likely have to make

If someone reads the demo and comes away thinking Tinjau demonstrated protection on real data,
**correct them immediately and unprompted**, even mid-conversation and even if it costs the
meeting. The canonical replay of the showcase 8-K resolves to `WATCH`; the `PROTECT` they watched
had a constructed price path. Being the one who volunteers that is the only version of this that
survives a second conversation.
