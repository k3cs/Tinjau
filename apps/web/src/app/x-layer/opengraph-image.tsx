import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Tinjau, Why X Layer: The market and the pool, on one chain.";

export default function Image() {
  return ogImage({
    eyebrow: "Why X Layer",
    title: "The market and the pool, on one chain.",
    note: "What is read from the chain, what was deployed onto it, and the RPC finding we measured and published back.",
  });
}
