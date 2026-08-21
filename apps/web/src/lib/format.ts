import { formatUnits } from "viem";

export function truncateAddress(address: string, lead = 6, tail = 4): string {
  if (address.length <= lead + tail + 3) return address;
  return `${address.slice(0, lead)}…${address.slice(-tail)}`;
}

export function truncateHash(hash: string): string {
  return truncateAddress(hash, 10, 8);
}

/** Unix seconds (bigint or number) -> "17 Aug 2026, 09:41 UTC". */
export function formatUnixSeconds(seconds: bigint | number): string {
  const n = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (!n) return "n/a";
  const d = new Date(n * 1000);
  return (
    d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" }) +
    ", " +
    d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "UTC" }) +
    " UTC"
  );
}

export function formatUnixDate(seconds: bigint | number): string {
  const n = typeof seconds === "bigint" ? Number(seconds) : seconds;
  if (!n) return "n/a";
  const d = new Date(n * 1000);
  return d.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric", timeZone: "UTC" });
}

export function relativeToNow(seconds: bigint | number, nowSeconds: number): string {
  const n = typeof seconds === "bigint" ? Number(seconds) : seconds;
  const diff = n - nowSeconds;
  const abs = Math.abs(diff);
  const days = Math.round(abs / 86400);
  if (days < 1) {
    const hours = Math.round(abs / 3600);
    return diff >= 0 ? `in ${hours}h` : `${hours}h ago`;
  }
  return diff >= 0 ? `in ${days}d` : `${days}d ago`;
}

/** Balance base units -> a plain decimal string, trimmed, never scientific notation. */
export function formatTokenAmount(balance: bigint, decimals: number, maxFractionDigits = 4): string {
  const full = formatUnits(balance, decimals);
  const [whole, frac = ""] = full.split(".");
  const trimmedFrac = frac.slice(0, maxFractionDigits).replace(/0+$/, "");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return trimmedFrac ? `${withCommas}.${trimmedFrac}` : withCommas;
}

/** declaredAmount is fixed-point, scaled by 1_000_000 (6-decimal convention, USD₮0-style). */
export function formatDeclaredAmount(value: bigint, currency: string): string {
  if (value === 0n && !currency) return "n/a";
  const abs = value < 0n ? -value : value;
  const sign = value < 0n ? "-" : "";
  const formatted = formatUnits(abs, 6);
  const [whole, frac = ""] = formatted.split(".");
  const withCommas = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const trimmedFrac = frac.slice(0, 2).padEnd(2, "0");
  return `${sign}${withCommas}.${trimmedFrac} ${currency || "?"}`;
}
