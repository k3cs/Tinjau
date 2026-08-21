/**
 * The Tinjau mark.
 *
 * It draws one bounded protection event, which is the only thing the product
 * claims: a flat baseline, a sharp rise when evidence qualifies, a plateau
 * where the response is held flat because it has hit the ceiling the contract
 * enforces, then a deterministic return to the same baseline it left.
 *
 * **The break at the top right is deliberate.** The stroke stops at the end of
 * the plateau and the descent begins as a separate subpath, so the curve reads
 * as cut off by its limit rather than as a smooth arc easing itself down. That
 * gap is the §0.6 boundary in one glyph: something proposes a rise, and a hard
 * line decides how far it gets. Closing the gap, or letting the plateau
 * overshoot, would make the logo assert something the contract forbids.
 *
 * Geometry is traced from `Tinjau-logo.png` at the repository root, not
 * redrawn by eye. The `regular` path set renders at IoU 0.96 against that file
 * (measured by rasterising both at 1024px and comparing lime pixel masks), and
 * the residual is antialiasing plus sub-unit corner rounding.
 *
 * Two weights, because one stroke cannot serve 20px and 200px. `regular` is
 * the faithful trace and is correct from roughly 64px up. `compact` is the
 * optically corrected small size: the same shape scaled up inside the box with
 * a heavier stroke, and the break widened to compensate, because at 28px a
 * 2.19-unit stroke renders under one pixel and washes from lime to olive. Use
 * `compact` for anything below about 48px, including every in-product use and
 * the favicon.
 *
 * Colour: `currentColor`, so the caller owns it. On carbon use `text-signal`
 * (`#BCFF2F`). On paper use `text-signal-deep` (`#2B6D17`), never the lime,
 * which fails contrast on a light surface. This is not a naive inversion; it is
 * the OKX light-mode brand token, and it is the same rule the rest of the
 * system follows.
 */
export function TinjauMark({
  className,
  weight = "compact",
}: {
  className?: string;
  weight?: "regular" | "compact";
}) {
  const compact = weight === "compact";

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      aria-hidden
      focusable="false"
      className={className}
    >
      <g
        transform={compact ? "translate(31.97 31.9) scale(1.25) translate(-31.97 -31.9)" : undefined}
        fill="none"
        stroke="currentColor"
        strokeWidth={compact ? 3.5 : 2.19}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* Baseline, qualifying rise, and the plateau held flat at the ceiling. */}
        <path
          d={`M9.78 42.81H16.2C17.7 42.81 19.0 40.3 19.72 38L23.95 26C24.6 24.15 26.2 20.98 27.7 20.98H${
            compact ? "38.2" : "39.6"
          }`}
        />
        {/* The return, starting past the break, landing on the baseline it left. */}
        <path
          d={
            compact
              ? "M40.7 28.2L44.29 38.2C45.2 40.7 46.5 42.81 48.3 42.81H54.16"
              : "M39.89 25.7L44.29 38.2C45.2 40.7 46.5 42.81 48.3 42.81H54.16"
          }
        />
      </g>
    </svg>
  );
}
