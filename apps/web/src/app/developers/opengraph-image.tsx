import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Tinjau, Developers: Use the boundary, not a black box.";

export default function Image() {
  return ogImage({
    eyebrow: "Developers",
    title: "Use the boundary, not a black box.",
    note: "Commands you can run right now against the deployed registry on X Layer Testnet, with no key.",
  });
}
