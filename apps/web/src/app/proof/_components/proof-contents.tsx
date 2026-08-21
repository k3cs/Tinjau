/**
 * A contents list, because this page absorbed the benchmark and got long.
 *
 * `/proof` now runs from the deployment ledger through the three-policy
 * benchmark, the claim gate, the findings, the architecture comparison, the
 * capability list and the build evidence. A reader arriving to check one
 * specific thing (does the registry exist, did the benchmark work, what is not
 * finished) had to scroll past everything else to find out whether the answer
 * was even on this page.
 *
 * The counts are not decoration. "27 of 27 reverse" and "failed" are the two
 * findings a reader most needs to see before deciding where to jump, and
 * putting them in the index means the page cannot bury its own bad news behind
 * a neutral-sounding heading.
 */
const SECTIONS = [
  { href: "#deployment-ledger-title", label: "Deployment ledger", note: "Addresses, bytecode, on chain" },
  { href: "#benchmark-title", label: "The measured result", note: "27 of 27 cells reverse" },
  { href: "#comparison-grid", label: "Every cell, both bases", note: "Pick a scenario and a setting" },
  { href: "#claim-gate", label: "The claim gate", note: "Failed. The loss claim stays disabled" },
  { href: "#defense-title", label: "What the usual controls miss", note: "Architecture, not a scoreboard" },
  { href: "#capability-proof-title", label: "Capability evidence", note: "What backs each part" },
  { href: "#build-evidence-title", label: "Build evidence", note: "Commit and services" },
];

export function ProofContents() {
  return (
    <nav aria-label="On this page" className="border-t border-edge pt-6">
      <p className="data-label text-ink-faint">On this page</p>
      <ol className="mt-4 grid gap-px border border-edge bg-edge sm:grid-cols-2 lg:grid-cols-4">
        {SECTIONS.map((section, index) => (
          <li key={section.href} className="bg-canvas">
            <a
              href={section.href}
              className="flex h-full min-h-20 flex-col justify-center gap-1 px-4 py-3 transition-colors duration-150 hover:bg-surface"
            >
              <span className="flex items-baseline gap-2">
                <span className="font-data text-[10px] text-ink-faint">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="text-body-sm font-medium text-ink">{section.label}</span>
              </span>
              <span className="pl-6 text-body-xs text-ink-muted">{section.note}</span>
            </a>
          </li>
        ))}
        {/* Seven items in a four-column grid leaves one cell, and an empty cell
            reads as a layout fault. It carries the sentence that applies to
            every row above it. */}
        <li className="bg-canvas">
          <div className="flex h-full min-h-20 flex-col justify-center gap-1 px-4 py-3">
            <span className="text-body-sm font-medium text-signal">Everything here is checkable</span>
            <span className="text-body-xs text-ink-muted">
              Addresses resolve on chain, artifacts link to the repository.
            </span>
          </div>
        </li>
      </ol>
    </nav>
  );
}
