import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Tinjau, Why it matters: We measured the problem before building for it.";

export default function Image() {
  return ogImage({
    eyebrow: "Why it matters",
    title: "We measured the problem before building for it.",
    note: "32 real SEC filings against 10 real tokenised-equity pools on X Layer. 25 left the pool on the wrong side of the first trade.",
  });
}
