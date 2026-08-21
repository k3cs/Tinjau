import { ImageResponse } from "next/og";

/**
 * One card design, rendered per route at build time.
 *
 * Every page shared the root `opengraph-image.png`, so a link to `/why-it-matters`
 * previewed as the site's generic card and told a reader nothing about what they
 * were being sent. The pages already carry their own title and description; this
 * puts them on the card.
 *
 * Deliberately no webfont. `ImageResponse` needs font bytes supplied to use one,
 * and fetching them at build is a failure mode that turns a preview image into a
 * broken build. The system stack is close enough at this size, and a card that
 * renders is worth more than a card that matches the site's type to the pixel.
 */
export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

const CANVAS = "#000000";
const SIGNAL = "#BCFF2F";
const INK = "#FFFFFF";
const MUTED = "#B3B3B3";
const EDGE = "#383838";

export function ogImage({
  eyebrow,
  title,
  note,
}: {
  eyebrow: string;
  title: string;
  note: string;
}) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: CANVAS,
          padding: "72px 80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* The mark, as a path rather than an <img>: no file read at build. */}
          <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
            <path
              d="M2 16c3.2 0 3.2-9 6.4-9s3.2 9 6.4 9 3.2-5 6.8-5"
              stroke={SIGNAL}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div style={{ display: "flex", fontSize: 38, fontWeight: 700, color: INK }}>Tinjau</div>
          <div
            style={{
              display: "flex",
              marginLeft: 16,
              paddingLeft: 18,
              borderLeft: `2px solid ${EDGE}`,
              fontSize: 22,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: SIGNAL,
            }}
          >
            {eyebrow}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              display: "flex",
              fontSize: title.length > 46 ? 66 : 78,
              fontWeight: 700,
              lineHeight: 1.06,
              letterSpacing: -2,
              color: INK,
              maxWidth: 1000,
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 28, lineHeight: 1.35, color: MUTED, maxWidth: 880 }}>
            {note}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            borderTop: `2px solid ${EDGE}`,
            paddingTop: 26,
            fontSize: 22,
            color: MUTED,
          }}
        >
          <div style={{ display: "flex" }}>tinjau.xyz</div>
          <div style={{ display: "flex" }}>Hackathon MVP · X Layer Testnet · replayed data</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
