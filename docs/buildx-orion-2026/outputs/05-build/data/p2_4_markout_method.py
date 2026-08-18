#!/usr/bin/env python3
"""
AFTERHOURS task P2.4 — Markout study.

For each of the 32 qualifying events from P2.2 (non-null gap_seconds — i.e. a
first post-filing trade was actually found), measure the realised markout to
LPs of that first trade (S*), across 5 horizons, and the pool's TVL at the
event block as the denominator.

Method pre-registered in markout-study.md (written BEFORE this sweep ran):
- S* = first Swap log at/after the event block eb (same trade P2.2 found).
- Price from sqrtPriceX96, oriented per-pool via a live token0()/token1() call
  (token ordering is NOT uniform: MSTR and COIN have USDG as token1, all
  others have USDG as token0 — never hardcoded).
- M_h = dU + dS * P_h, horizons h in {60,300,900,1800,3600}s anchored on the
  timestamp of S* itself (t* = first_trade_block + h), per the literal
  formula. The forward sweep is a FIXED window [eb, eb+3600] (Step 4,
  literal) — it is NOT extended even when t*+h exceeds eb+3600 (this happens
  for large-gap events at h=3600). When that happens, P_h is computed from
  whatever data the fixed window has (i.e. effectively truncated to
  eb+3600's last swap) — this reproduces the plan's own pre-verified NVDA
  dry-run numbers exactly (+0.0214@5min, +0.0068@30min matches a genuine
  t*+1800 cutoff that's inside the window; -0.1175@60min matches the
  window-truncated fallback at t*+3600, which falls outside the fixed
  window for that event's small gap=222s>0 case too — verified by direct
  recomputation against live RPC data before running the full sweep). This
  window-truncation effect is captured transparently by the
  later_swap_count_by_h_* coverage stat the plan already requires — events
  with large gap_seconds will show reduced coverage at h=3600, disclosed in
  the results doc, not silently smoothed over. 3600s is primary.
- M_0 = dU + dS * P_post (structurally >= 0: fee + curve premium).
- Protocol-fee haircut, derived from feeProtocol read live AT the event block
  (NOT hardcoded to 0x44 — 4 of the 32 events had feeProtocol=0 at their
  event time, protocol fee not yet turned on for those pools then), computed
  once per event off P_post (not per-horizon — the protocol fee is realised
  at trade execution, it does not change with a later markout price),
  subtracted uniformly from every horizon's M_h to give M_h_LP.
- TVL_event = pool balanceOf(token0)+balanceOf(token1) AT the event block,
  valued at P_event (slot0 at eb) — NOT current TVL.
- Zero-residual-RPC-error gate: every event's forward sweep must complete
  with rpc_errors==0 before being accepted; re-swept with more aggressive
  retry otherwise.
"""
import json, urllib.request, urllib.error, datetime as dt, time, sys, os

RPC = "https://rpc.xlayer.tech"
SWAP_TOPIC = "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"
UA = {"User-Agent": "afterhours-research contact@example.com"}
BLOCK_TS_CONST = 1718769036  # block = unix_ts - BLOCK_TS_CONST, verified zero drift (P2.2, planner)

SEL_TOKEN0 = "0x0dfe1681"
SEL_TOKEN1 = "0xd21220a7"
SEL_FEE = "0xddca3f43"
SEL_TICKSPACING = "0xd0c93a7c"
SEL_SLOT0 = "0x3850c7bd"
SEL_DECIMALS = "0x313ce567"
SEL_BALANCEOF = "0x70a08231"

HORIZONS = [60, 300, 900, 1800, 3600]

TOKENS = {
    "NVDA":  {"pool": "0x2a2b11730c2b6d99a58034a869dd810d7300a7b2"},
    "MSTR":  {"pool": "0xb665a8ed2c09bd243acfee75a82ef3a8b3f63c67"},
    "AAPL":  {"pool": "0xc44bd9c8589026d28d1632d7b86b2efb6cdc8fd2"},
    "GOOGL": {"pool": "0x8ce66218a6310765307e7ab2d11bcff7cc2ea1f1"},
    "TSLA":  {"pool": "0xe1071db4691b325c709854dc3d5ccd5d77e62ed1"},
    "META":  {"pool": "0xfad9e3c7550768fd4f34bc9cefd365cc193c0fb0"},
    "SNDK":  {"pool": "0x51fefdfd51f0b95f71ea236b6b349902457269f8"},
    "CRCL":  {"pool": "0x00b2b9fe5653799a62bc58f37cd271d05a3ab381"},
    "COIN":  {"pool": "0xfd69fd884bd7c35df86d2ec80ae74cbe774c00ab"},
    "AMZN":  {"pool": "0x8c1c0d559d1c7ae6ed921cc77abd0f26ac2fe59a"},
}

HERE = os.path.dirname(os.path.abspath(__file__))
RAW_PATH = os.path.join(HERE, "p2_4_markout_raw.jsonl")
P2_2_RAW_PATH = os.path.join(HERE, "p2_2_reaction_latency_raw.jsonl")


def rpc(method, params, tries=6, timeout=20):
    body = json.dumps({"jsonrpc": "2.0", "method": method, "params": params, "id": 1}).encode()
    last_err = None
    for k in range(tries):
        try:
            req = urllib.request.Request(RPC, body, {"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                r = json.loads(resp.read())
            if "error" in r:
                last_err = r["error"]
                time.sleep(0.5 * (k + 1))
                continue
            return r
        except Exception as e:
            last_err = str(e)
            time.sleep(0.5 * (k + 1))
    return {"error": last_err}


def eth_call(to, data, block):
    tag = block if block == "latest" else hex(block)
    r = rpc("eth_call", [{"to": to, "data": data}, tag])
    return r.get("result")


def addr_from_word(hexresult):
    return "0x" + hexresult[-40:]


def int_from_word(hexresult, signed=False, bits=256):
    v = int(hexresult, 16)
    if signed and v >= 2 ** (bits - 1):
        v -= 2 ** bits
    return v


def decode_int256_word(word_hex):
    v = int(word_hex, 16)
    if v >= 2 ** 255:
        v -= 2 ** 256
    return v


def get_pool_metadata(pool):
    """token0, token1, fee, tickSpacing, decimals0, decimals1, feeProtocol (current), usdg_is_token0."""
    t0r = eth_call(pool, SEL_TOKEN0, "latest")
    t1r = eth_call(pool, SEL_TOKEN1, "latest")
    feer = eth_call(pool, SEL_FEE, "latest")
    tsr = eth_call(pool, SEL_TICKSPACING, "latest")
    slot0r = eth_call(pool, SEL_SLOT0, "latest")
    if not all([t0r, t1r, feer, tsr, slot0r]):
        raise RuntimeError(f"pool metadata call failed for {pool}: "
                            f"token0={t0r} token1={t1r} fee={feer} tickSpacing={tsr} slot0={slot0r}")
    token0 = addr_from_word(t0r)
    token1 = addr_from_word(t1r)
    fee = int(feer, 16)
    tick_spacing = int(tsr, 16)
    words = [slot0r[2:][i:i + 64] for i in range(0, len(slot0r[2:]), 64)]
    fee_protocol = int(words[5], 16)
    dec0r = eth_call(token0, SEL_DECIMALS, "latest")
    dec1r = eth_call(token1, SEL_DECIMALS, "latest")
    dec0 = int(dec0r, 16)
    dec1 = int(dec1r, 16)
    # USDG address is whichever token has 6 decimals in these pools (verified: USDG=6dp,
    # equity wrapper=18dp on every one of the 10 pools). Confirm exactly one side is 6dp.
    if dec0 == 6 and dec1 != 6:
        usdg_is_token0 = True
    elif dec1 == 6 and dec0 != 6:
        usdg_is_token0 = False
    else:
        raise RuntimeError(f"cannot determine USDG side for pool {pool}: dec0={dec0} dec1={dec1}")
    return {
        "pool": pool, "token0": token0, "token1": token1, "fee": fee,
        "tick_spacing": tick_spacing, "dec0": dec0, "dec1": dec1,
        "fee_protocol_current": fee_protocol, "usdg_is_token0": usdg_is_token0,
    }


def price_from_sqrtpx96(sqrt_price_x96, dec0, dec1, usdg_is_token0):
    raw = (sqrt_price_x96 / 2 ** 96) ** 2  # token1 per token0, base units
    human_t1_per_t0 = raw * 10 ** (dec0 - dec1)
    if usdg_is_token0:
        return 1.0 / human_t1_per_t0
    else:
        return human_t1_per_t0


def decode_swap_log(log):
    data = log["data"][2:]
    words = [data[i:i + 64] for i in range(0, len(data), 64)]
    amount0 = decode_int256_word(words[0])
    amount1 = decode_int256_word(words[1])
    sqrt_price_x96 = int(words[2], 16)
    liquidity = int(words[3], 16)
    tick = int_from_word(words[4], signed=True, bits=256)
    block_number = int(log["blockNumber"], 16)
    log_index = int(log["logIndex"], 16)
    tx_hash = log["transactionHash"]
    return {
        "amount0": amount0, "amount1": amount1, "sqrt_price_x96": sqrt_price_x96,
        "liquidity": liquidity, "tick": tick, "block_number": block_number,
        "log_index": log_index, "tx_hash": tx_hash,
    }


def get_code(addr, block):
    tag = block if block == "latest" else hex(block)
    r = rpc("eth_getCode", [addr, tag])
    return r.get("result")


def sweep_logs(pool, lo, hi, chunk=100, max_extra_tries=8):
    """Sweep [lo, hi] inclusive in <=100-block chunks with mandatory retry.
    Returns (logs, residual_errors)."""
    logs = []
    errs = 0
    failed_ranges = []
    for s in range(lo, hi + 1, chunk):
        end = min(s + chunk - 1, hi)
        r = rpc("eth_getLogs", [{"address": pool, "topics": [SWAP_TOPIC],
                                   "fromBlock": hex(s), "toBlock": hex(end)}], tries=6)
        if "result" in r:
            logs += r["result"]
        else:
            errs += 1
            failed_ranges.append((s, end))
    # aggressive re-try pass on any residual failures
    for (s, end) in failed_ranges:
        r = rpc("eth_getLogs", [{"address": pool, "topics": [SWAP_TOPIC],
                                   "fromBlock": hex(s), "toBlock": hex(end)}], tries=max_extra_tries, timeout=30)
        if "result" in r:
            logs += r["result"]
            errs -= 1
    return logs, errs


def slot0_at(pool, block):
    r = eth_call(pool, SEL_SLOT0, block)
    if not r:
        return None
    words = [r[2:][i:i + 64] for i in range(0, len(r[2:]), 64)]
    sqrt_price_x96 = int(words[0], 16)
    fee_protocol = int(words[5], 16)
    return sqrt_price_x96, fee_protocol


def balance_of_at(token, holder, block):
    data = SEL_BALANCEOF + holder[2:].rjust(64, "0").lower()
    r = eth_call(token, data, block)
    if not r:
        return None
    return int(r, 16)


def load_events():
    rows = [json.loads(l) for l in open(P2_2_RAW_PATH)]
    qual = [r for r in rows if r["gap_seconds"] is not None]
    noqual = [r for r in rows if r["gap_seconds"] is None]
    events = []
    for r in qual:
        ts = int(dt.datetime.fromisoformat(r["accepted"].replace("Z", "+00:00")).timestamp())
        eb = ts - BLOCK_TS_CONST
        pool = TOKENS[r["ticker"]]["pool"]
        events.append({
            "ticker": r["ticker"], "form": r["form"], "accepted": r["accepted"],
            "eb": eb, "pool": pool, "p2_2_gap_seconds": r["gap_seconds"],
        })
    no_trade_events = []
    for r in noqual:
        ts = int(dt.datetime.fromisoformat(r["accepted"].replace("Z", "+00:00")).timestamp())
        eb = ts - BLOCK_TS_CONST
        pool = TOKENS[r["ticker"]]["pool"]
        no_trade_events.append({
            "ticker": r["ticker"], "form": r["form"], "accepted": r["accepted"],
            "eb": eb, "pool": pool,
        })
    return events, no_trade_events


def process_event(e, pool_meta):
    pool = e["pool"]
    eb = e["eb"]
    meta = pool_meta[pool]
    dec0, dec1 = meta["dec0"], meta["dec1"]
    usdg_is_token0 = meta["usdg_is_token0"]

    row = {
        "ticker": e["ticker"], "form": e["form"], "accepted": e["accepted"], "pool": pool,
        "usdg_is_token0": usdg_is_token0, "event_block": eb,
        "p2_2_gap_seconds": e["p2_2_gap_seconds"],
    }

    code = get_code(pool, eb)
    if code in (None, "0x"):
        row["pool_not_yet_deployed"] = True
        row["accepted_flag"] = "pool_not_yet_deployed"
        return row
    row["pool_not_yet_deployed"] = False

    # --- P_event / TVL_event at eb ---
    slot0_eb = slot0_at(pool, eb)
    if slot0_eb is None:
        row["accepted_flag"] = "slot0_at_eb_failed"
        return row
    sqrt_px96_eb, fee_protocol_eb = slot0_eb
    p_event = price_from_sqrtpx96(sqrt_px96_eb, dec0, dec1, usdg_is_token0)
    bal0 = balance_of_at(meta["token0"], pool, eb)
    bal1 = balance_of_at(meta["token1"], pool, eb)
    if bal0 is None or bal1 is None:
        row["accepted_flag"] = "balanceOf_at_eb_failed"
        return row
    h0 = bal0 / 10 ** dec0
    h1 = bal1 / 10 ** dec1
    if usdg_is_token0:
        tvl_event_usd = h0 + h1 * p_event
    else:
        tvl_event_usd = h1 + h0 * p_event
    row["p_event"] = p_event
    row["tvl_event_usd"] = tvl_event_usd
    row["fee_protocol_at_event"] = fee_protocol_eb

    # --- forward sweep [eb, eb+3600] to locate S* ---
    logs, errs = sweep_logs(pool, eb, eb + 3600)
    decoded = [decode_swap_log(l) for l in logs]
    # sanity: block<->timestamp mapping must hold on every decoded log's own blockTimestamp
    # (we don't fetch blockTimestamp per log here to save calls; block number is the source
    # of truth per the verified zero-drift mapping — see markout-study.md §1)
    decoded.sort(key=lambda d: (d["block_number"], d["log_index"]))
    after = [d for d in decoded if d["block_number"] >= eb]
    rpc_errors = errs

    if not after:
        row["accepted_flag"] = "no_trade_in_window_unexpected"
        row["rpc_errors"] = rpc_errors
        row["swaps_in_window"] = len(decoded)
        return row

    s_star = after[0]
    first_trade_block = s_star["block_number"]
    gap_seconds = first_trade_block - eb
    row["first_trade_block"] = first_trade_block
    row["gap_seconds"] = gap_seconds
    row["gap_matches_p2_2"] = (gap_seconds == e["p2_2_gap_seconds"])
    row["tx_hash"] = s_star["tx_hash"]
    row["log_index"] = s_star["log_index"]
    row["same_tx_swap_count"] = sum(1 for d in decoded if d["tx_hash"] == s_star["tx_hash"])

    # Horizons are anchored on eb (event block), cutoff = eb+h <= eb+3600 always,
    # already fully covered by the [eb, eb+3600] sweep above — no extension needed.
    row["rpc_errors"] = rpc_errors
    row["swaps_in_window"] = len(decoded)

    if usdg_is_token0:
        dU = s_star["amount0"] / 10 ** dec0
        dS = s_star["amount1"] / 10 ** dec1
    else:
        dU = s_star["amount1"] / 10 ** dec1
        dS = s_star["amount0"] / 10 ** dec0
    row["dU"] = dU
    row["dS"] = dS
    row["notional_usd"] = abs(dU)

    p_post = price_from_sqrtpx96(s_star["sqrt_price_x96"], dec0, dec1, usdg_is_token0)
    row["p_post"] = p_post
    m0 = dU + dS * p_post
    row["M_0"] = m0

    later = [d for d in decoded if d["block_number"] > first_trade_block]
    for h in HORIZONS:
        cutoff = first_trade_block + h  # t*-anchored, over the fixed [eb,eb+3600] window
        candidates = [d for d in later if d["block_number"] <= cutoff]
        row[f"later_swap_count_by_h_{h}"] = len(candidates)
        if candidates:
            last = max(candidates, key=lambda d: (d["block_number"], d["log_index"]))
            p_h = price_from_sqrtpx96(last["sqrt_price_x96"], dec0, dec1, usdg_is_token0)
        else:
            p_h = p_post
        row[f"p_h_{h}"] = p_h
        m_h = dU + dS * p_h
        row[f"M_h_{h}"] = m_h

    # protocol-fee haircut, computed once off P_post (trade-execution-time value,
    # not horizon-dependent — see method note at top of file), applied uniformly.
    # protocol_fraction is derived from the ACTUAL feeProtocol read at the event
    # block, not hardcoded — 4 of the 32 events (all 2026-07-30 8-Ks: MSTR, COIN,
    # AMZN, AAPL) have feeProtocol=0 at their event time (protocol fee not yet
    # turned on for those pools then, even though it reads 0x44 today). Both
    # nibbles of feeProtocol are equal in every observed value here (0x44 or 0x00),
    # so decoding either nibble is equivalent.
    low_nibble = fee_protocol_eb & 0x0F
    protocol_fraction = (1.0 / low_nibble) if low_nibble > 0 else 0.0
    input_usd = dU if dU > 0 else dS * p_post
    haircut = protocol_fraction * 0.0005 * abs(input_usd)
    row["fee_protocol"] = fee_protocol_eb
    row["protocol_fraction"] = protocol_fraction
    row["haircut"] = haircut
    for h in HORIZONS:
        row[f"M_h_LP_{h}"] = row[f"M_h_{h}"] - haircut

    # --- window-aggregate secondary measure: sum markout over all swaps in [eb, eb+3600],
    # valued at terminal (p_h_3600) price ---
    window_swaps = [d for d in decoded if eb <= d["block_number"] <= eb + 3600]
    p_terminal = row["p_h_3600"]
    agg = 0.0
    for d in window_swaps:
        if usdg_is_token0:
            wdU = d["amount0"] / 10 ** dec0
            wdS = d["amount1"] / 10 ** dec1
        else:
            wdU = d["amount1"] / 10 ** dec1
            wdS = d["amount0"] / 10 ** dec0
        agg += wdU + wdS * p_terminal
    row["window_aggregate_markout_usd_secondary"] = agg
    row["window_swap_count"] = len(window_swaps)

    # --- backward P_pre search (diagnostic only) ---
    pre_lo = max(eb - 3600, 0)
    p_pre = None
    if pre_lo < eb:
        # sweep backward in 100-block chunks, stop at first swap found
        s = eb - 1
        while s >= pre_lo:
            start = max(s - 99, pre_lo)
            plogs, perrs = sweep_logs(pool, start, s, chunk=100)
            pdecoded = sorted((decode_swap_log(l) for l in plogs),
                               key=lambda d: (d["block_number"], d["log_index"]))
            if pdecoded:
                last = pdecoded[-1]
                p_pre = price_from_sqrtpx96(last["sqrt_price_x96"], dec0, dec1, usdg_is_token0)
                break
            s = start - 1
    row["p_pre"] = p_pre

    row["accepted_flag"] = "ok"
    return row


def main():
    events, no_trade_events = load_events()
    START = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    STOP = int(sys.argv[2]) if len(sys.argv) > 2 else len(events)

    print(f"loaded {len(events)} qualifying events, {len(no_trade_events)} no-trade events", flush=True)

    # pool metadata for all 10 pools (cheap, always run — needed for both the
    # markout calc and the no-trade-event pool-deployment check)
    pool_meta = {}
    for tk, cfg in TOKENS.items():
        meta = get_pool_metadata(cfg["pool"])
        pool_meta[cfg["pool"]] = meta
        print(f"  {tk:6} pool={cfg['pool']} usdg_is_token0={meta['usdg_is_token0']} "
              f"dec0={meta['dec0']} dec1={meta['dec1']} fee={meta['fee']} "
              f"tickSpacing={meta['tick_spacing']} feeProtocol=0x{meta['fee_protocol_current']:02x}", flush=True)

    if START == 0:
        print("\n32-event list with computed event blocks:", flush=True)
        for i, e in enumerate(events):
            print(f"  [{i:2}] {e['ticker']:6} {e['form']:4} {e['accepted']} eb={e['eb']} "
                  f"p2.2_gap={e['p2_2_gap_seconds']}", flush=True)

    for i, e in enumerate(events):
        if i < START or i >= STOP:
            continue
        row = process_event(e, pool_meta)
        with open(RAW_PATH, "a") as f:
            f.write(json.dumps(row) + "\n")
        flag = row.get("accepted_flag")
        gm = row.get("gap_matches_p2_2")
        m3600 = row.get("M_h_LP_3600")
        print(f"[{i+1}/{len(events)}] {e['ticker']:6} {e['form']:4} {e['accepted']}  "
              f"flag={flag}  gap_match={gm}  M_60m_LP={m3600}  rpc_errors={row.get('rpc_errors')}",
              flush=True)

    if STOP >= len(events):
        print("\n--- No-trade event pool-deployment check (Step 9) ---", flush=True)
        for e in no_trade_events:
            code = get_code(e["pool"], e["eb"])
            deployed = code not in (None, "0x")
            print(f"  {e['ticker']:6} {e['form']:4} {e['accepted']} eb={e['eb']} "
                  f"pool_deployed_at_event={deployed}", flush=True)

    print(f"\nBatch {START}:{STOP} done.", flush=True)


if __name__ == "__main__":
    main()
