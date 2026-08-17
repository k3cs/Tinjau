#!/usr/bin/env python3
"""
AFTERHOURS task P2.2 — On-chain reaction-latency study.

For every 8-K / Form 4 filing (from the 10 tokenised-equity underlyings) whose
EDGAR acceptance timestamp falls inside that token's available X Layer price
history, compute the interval from acceptance to the first Swap event in the
token's reference USDG pool, via targeted RPC windows with mandatory retry.

Method pre-registered per spec §4.8b / task-tracker.md P2.2:
- Reference pool = each token's USDG pool (largest / primary liquidity venue).
- Window = event timestamp ± 60 minutes, swept in the RPC's 100-block cap chunks.
- Block<->timestamp conversion via the calibrated 1.000s/block ratio (spec §7).
- Retry every failed getLogs call — a no-retry pass on one filing measured
  435s vs 237s with retry, i.e. failures bias the result upward.
- Report split by form type: 8-K (primary) and Form 4 (secondary), plus overall.
- A "no trade within the window" result is a genuine finding, not missing data.
"""
import json, urllib.request, urllib.error, datetime as dt, time, sys

RPC = "https://rpc.xlayer.tech"
SWAP_TOPIC = "0xc42079f94a6350d7e6235f29174924f928cc2ac818eb64fed8004e115fbcca67"
UA = {"User-Agent": "afterhours-research contact@example.com"}

# Calibrated 2026-08-17: block 68168934 @ ts 1786937970, exactly 1.000 s/block
# over a 100k-block sample. Re-freshen at run time against the live head so
# the mapping stays accurate no matter when this actually executes.
def get_calibration():
    r = rpc("eth_blockNumber", [])
    head = int(r["result"], 16)
    blk = rpc("eth_getBlockByNumber", [hex(head), False])["result"]
    return head, int(blk["timestamp"], 16)

def rpc(method, params, tries=4, timeout=15):
    body = json.dumps({"jsonrpc": "2.0", "method": method, "params": params, "id": 1}).encode()
    last_err = None
    for k in range(tries):
        try:
            req = urllib.request.Request(RPC, body, {"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read())
        except Exception as e:
            last_err = e
            time.sleep(0.4 * (k + 1))
    return {"error": str(last_err)}

def edgar_get(url, tries=3):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=20) as r:
                return json.loads(r.read())
        except Exception:
            time.sleep(0.3 * (k + 1))
    return None

# ---- 1. Ticker -> CIK, price-history window start, reference USDG pool ----
TOKENS = {
    "NVDA":  {"cik": "0001045810", "window_start": "2026-07-20", "pool": "0x2a2b11730c2b6d99a58034a869dd810d7300a7b2"},
    "MSTR":  {"cik": "0001050446", "window_start": "2026-07-20", "pool": "0xb665a8ed2c09bd243acfee75a82ef3a8b3f63c67"},
    "AAPL":  {"cik": "0000320193", "window_start": "2026-07-29", "pool": "0xc44bd9c8589026d28d1632d7b86b2efb6cdc8fd2"},
    "GOOGL": {"cik": "0001652044", "window_start": "2026-07-29", "pool": "0x8ce66218a6310765307e7ab2d11bcff7cc2ea1f1"},
    "TSLA":  {"cik": "0001318605", "window_start": "2026-07-29", "pool": "0xe1071db4691b325c709854dc3d5ccd5d77e62ed1"},
    "META":  {"cik": "0001326801", "window_start": "2026-07-29", "pool": "0xfad9e3c7550768fd4f34bc9cefd365cc193c0fb0"},
    "SNDK":  {"cik": "0002023554", "window_start": "2026-07-29", "pool": "0x51fefdfd51f0b95f71ea236b6b349902457269f8"},
    "CRCL":  {"cik": "0001876042", "window_start": "2026-07-29", "pool": "0x00b2b9fe5653799a62bc58f37cd271d05a3ab381"},
    "COIN":  {"cik": "0001679788", "window_start": "2026-07-29", "pool": "0xfd69fd884bd7c35df86d2ec80ae74cbe774c00ab"},
    "AMZN":  {"cik": "0001018724", "window_start": "2026-07-29", "pool": "0x8c1c0d559d1c7ae6ed921cc77abd0f26ac2fe59a"},
}
END_DATE = "2026-08-17"

def main():
    head_block, head_ts = get_calibration()
    print(f"calibration: block {head_block} @ ts {head_ts} ({dt.datetime.fromtimestamp(head_ts, dt.UTC)})", flush=True)
    def ts_to_block(ts):
        return head_block - (head_ts - ts)

    # ---- 2. Build the filing list per token, within its price window ----
    events = []
    for tk, cfg in TOKENS.items():
        d = edgar_get(f"https://data.sec.gov/submissions/CIK{cfg['cik']}.json")
        if not d:
            print(f"  WARN: EDGAR fetch failed for {tk}", flush=True)
            continue
        r = d["filings"]["recent"]
        for f, fd, ad in zip(r["form"], r["filingDate"], r["acceptanceDateTime"]):
            if f not in ("8-K", "4"):
                continue
            if not (cfg["window_start"] <= fd <= END_DATE):
                continue
            events.append({"ticker": tk, "form": f, "accepted": ad, "pool": cfg["pool"]})
        time.sleep(0.15)

    print(f"filings in scope: {len(events)}", flush=True)
    for e in events:
        print(f"  {e['ticker']:6} {e['form']:4} {e['accepted']}", flush=True)

    # ---- 3. RPC sweep per event ----
    START = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    STOP = int(sys.argv[2]) if len(sys.argv) > 2 else len(events)
    results_path = "/private/tmp/claude-501/-Users-scientivan-Programming-New/f4c1b3ad-65bf-4610-86f5-17a43a3416c6/scratchpad/p2_2_results.jsonl"
    results = []
    for i, e in enumerate(events):
        if i < START or i >= STOP:
            continue
        ts = int(dt.datetime.fromisoformat(e["accepted"].replace("Z", "+00:00")).timestamp())
        lo, hi = ts_to_block(ts - 3600), ts_to_block(ts + 3600)
        eb = ts_to_block(ts)
        swaps = []
        errs = 0
        for s in range(lo, hi, 100):
            end = min(s + 99, hi)
            r = rpc("eth_getLogs", [{"address": e["pool"], "topics": [SWAP_TOPIC],
                                       "fromBlock": hex(s), "toBlock": hex(end)}])
            if "result" in r:
                swaps += r["result"]
            else:
                errs += 1
        blocks = sorted(int(l["blockNumber"], 16) for l in swaps)
        after = [b for b in blocks if b >= eb]
        gap_s = (after[0] - eb) if after else None
        row = {
            "ticker": e["ticker"], "form": e["form"], "accepted": e["accepted"],
            "swaps_in_window": len(blocks), "gap_seconds": gap_s, "rpc_errors": errs,
        }
        results.append(row)
        with open(results_path, "a") as f:
            f.write(json.dumps(row) + "\n")
        print(f"[{i+1}/{len(events)}] {e['ticker']:6} {e['form']:4} {e['accepted']}  "
              f"swaps={len(blocks):>4}  gap={gap_s if gap_s is not None else 'NO TRADE'}  errs={errs}", flush=True)

    print(f"\nBatch {START}:{STOP} done. Wrote {len(results)} rows to {results_path}", flush=True)

    def summarize(rows, label):
        gaps = sorted(r["gap_seconds"] for r in rows if r["gap_seconds"] is not None)
        no_trade = sum(1 for r in rows if r["gap_seconds"] is None)
        print(f"\n--- {label} (n={len(rows)}) ---")
        print(f"  no trade within +-60min: {no_trade}")
        if gaps:
            med = gaps[len(gaps)//2] if len(gaps) % 2 else (gaps[len(gaps)//2-1]+gaps[len(gaps)//2])/2
            print(f"  median gap: {med:.0f}s ({med/60:.1f} min)")
            print(f"  min={gaps[0]}s  max={gaps[-1]}s")
        else:
            print("  (no measurable gaps)")

    summarize(results, "ALL")
    summarize([r for r in results if r["form"] == "8-K"], "8-K (primary)")
    summarize([r for r in results if r["form"] == "4"], "Form 4 (secondary)")
    for tk in TOKENS:
        rows = [r for r in results if r["ticker"] == tk]
        if rows:
            print(f"\n  {tk}: n={len(rows)}")

if __name__ == "__main__":
    main()
