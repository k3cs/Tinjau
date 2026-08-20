export function UnavailableValue({ label = "Unavailable" }: { label?: string }) {
  return <span className="font-data text-ink-muted">{label}</span>;
}
