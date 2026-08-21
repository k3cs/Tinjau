import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Tinjau, How it decides: The model never gets the keys.";

export default function Image() {
  return ogImage({
    eyebrow: "How it decides",
    title: "The model never gets the keys.",
    note: "What the model is used for, what it may never do, and two frozen cases followed from the news that arrived to the fee the pool charged.",
  });
}
