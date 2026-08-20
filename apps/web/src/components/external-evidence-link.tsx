export function ExternalEvidenceLink({ href }: { href: string | null }) {
  if (!href) {
    return <span className="font-data text-[11px] text-ink-muted">No resolvable source</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-8 items-center gap-2 rounded-sm font-data text-[11px] font-medium text-signal underline decoration-edge-strong transition-colors hover:text-white"
    >
      Open original
      <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none">
        <path d="M6 3h7v7M13 3 5 11" stroke="currentColor" strokeWidth="1.5" />
        <path d="M11 9v4H3V5h4" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </a>
  );
}
