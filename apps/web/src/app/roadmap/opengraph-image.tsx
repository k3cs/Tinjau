import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Tinjau, Roadmap: A line down the middle of the product.";

export default function Image() {
  return ogImage({
    eyebrow: "Roadmap",
    title: "A line down the middle of the product.",
    note: "What runs today, what is built but not plugged in, and what is not built, each gated by a named condition rather than a date.",
  });
}
