import type { ReactNode } from "react";

/**
 * The frame every diagram on this site sits in.
 *
 * Three things are mandatory and none of them are decoration:
 *
 *  - a `<title>` inside the SVG, wired to `role="img"`, so the picture has an
 *    accessible name rather than being skipped;
 *  - a `<desc>` that says in words what the drawing says in geometry, because a
 *    diagram that only works visually is a diagram that excludes readers;
 *  - a `status` line, which states whether the picture is a measurement, a rule,
 *    or an illustration. A drawn line looks like evidence whether or not it is
 *    any, so the distinction travels with the picture and cannot be lost when
 *    the surrounding copy is trimmed.
 */
export type DiagramStatus =
  | { kind: "MEASURED"; text: string }
  | { kind: "RULE"; text: string }
  | { kind: "ILLUSTRATION"; text: string };

const STATUS_TONE: Record<DiagramStatus["kind"], string> = {
  MEASURED: "border-confirm/50 text-confirm-soft",
  RULE: "border-signal/50 text-signal",
  ILLUSTRATION: "border-edge-strong text-ink-faint",
};

const STATUS_LABEL: Record<DiagramStatus["kind"], string> = {
  MEASURED: "Measured",
  RULE: "Rule",
  ILLUSTRATION: "Drawing",
};

export function DiagramFigure({
  title,
  description,
  status,
  viewBox,
  children,
  className = "",
}: {
  title: string;
  description: string;
  status: DiagramStatus;
  viewBox: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <figure className={`rounded-xl border border-edge bg-canvas-sunken ${className}`}>
      {/*
        `max-w` is load-bearing, not a taste call. The SVG scales its whole
        coordinate system to the container, so a 660-unit drawing stretched to a
        1380px column renders its 11px labels at 23px. Capping the width keeps
        the scale factor near 1, which is the only way type inside a scaled SVG
        stays the size it was designed at.
      */}
      <div className="overflow-x-auto p-4 sm:p-6">
        <svg
          viewBox={viewBox}
          role="img"
          className="mx-auto block h-auto w-full min-w-[520px] max-w-[760px] overflow-visible"
        >
          <title>{title}</title>
          <desc>{description}</desc>
          {children}
        </svg>
      </div>
      <figcaption className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-edge px-4 py-3 sm:px-6">
        <span
          className={`inline-flex min-h-6 items-center border px-2 font-data text-[10px] font-semibold tracking-[0.06em] ${STATUS_TONE[status.kind]}`}
        >
          {STATUS_LABEL[status.kind]}
        </span>
        <span className="text-body-xs text-ink-muted">{status.text}</span>
      </figcaption>
    </figure>
  );
}

/** Shared text sizes, so eight diagrams do not drift into eight type scales. */
export const LABEL = "font-data text-[11px] uppercase tracking-[0.06em]";
export const VALUE = "font-data text-[13px] tabular";
export const NOTE = "font-body text-[12px]";
