export function SiteFooter() {
  return (
    <footer className="border-t border-edge bg-canvas">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-4 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">
          AI can interpret evidence and propose a risk state. Deterministic policy decides whether
          bounded protection is allowed.
        </p>
        <p className="font-data text-[11px] uppercase tracking-[0.06em] text-ink-muted">
          Evidence → confirmation → bounded action → recovery
        </p>
      </div>
    </footer>
  );
}
