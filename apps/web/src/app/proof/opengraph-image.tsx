import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Tinjau, Proof: No winner. We are publishing that.";

export default function Image() {
  return ogImage({
    eyebrow: "Proof",
    title: "No winner. We are publishing that.",
    note: "Deployed addresses, the three-policy benchmark, and the pre-registered claim gate that failed.",
  });
}
