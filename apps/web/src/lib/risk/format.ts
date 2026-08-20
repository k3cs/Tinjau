export function formatUtc(iso: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(iso));
}

export function formatDuration(seconds: number): string {
  if (seconds === 0) return "0 sec";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [hours ? `${hours} hr` : null, minutes ? `${minutes} min` : null].filter(Boolean).join(" ");
}

export function formatFee(raw: string | null): string {
  if (raw === null) return "Unavailable";
  const fee = Number(raw);
  if (!Number.isFinite(fee)) return raw;
  return `${(fee / 10_000).toFixed(2)}%`;
}

export function shortHex(value: string): string {
  return value.length > 18 ? `${value.slice(0, 10)}…${value.slice(-6)}` : value;
}

export function humanizeCode(code: string): string {
  return code
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
