"use client";

import { useState } from "react";

import { shortHex } from "@/lib/risk/format";

/**
 * An address, hash or pool id, truncated for reading and copyable in full.
 *
 * The full value is in `title` and in the clipboard, never only in the ellipsis
 * because a judge checking a hash against an explorer needs all of it. Optionally
 * links out to the X Layer explorer when the chain is known.
 */
export function HexValue({
  value,
  href,
  label,
}: {
  value: string;
  href?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard can be blocked by permissions. The value stays selectable.
      setCopied(false);
    }
  }

  const tone = "border-edge text-ink-secondary hover:border-edge-strong hover:text-ink";

  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {label ? (
        <span className="data-label text-ink-faint">{label}</span>
      ) : null}
      <span
        className={`inline-flex items-center rounded border px-2 py-1 font-data text-[11px] ${tone}`}
        title={value}
      >
        {shortHex(value)}
      </span>
      <button
        type="button"
        onClick={copy}
        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded px-2 font-data text-[10px] uppercase tracking-[0.06em] text-ink-faint transition-colors duration-150 ease-tinjau hover:text-signal"
        aria-label={copied ? `Copied ${value}` : `Copy ${label ?? "value"} ${value}`}
      >
        {copied ? "Copied" : "Copy"}
      </button>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex min-h-10 items-center rounded px-2 font-data text-[10px] uppercase tracking-[0.06em] text-ink-faint underline transition-colors duration-150 ease-tinjau hover:text-signal"
        >
          Explorer
        </a>
      ) : null}
    </span>
  );
}
