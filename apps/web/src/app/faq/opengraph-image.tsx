import { ogImage, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/og";

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = "Tinjau, FAQ: Including the ones we would rather not be asked.";

export default function Image() {
  return ogImage({
    eyebrow: "FAQ",
    title: "Including the ones we would rather not be asked.",
    note: "The seven judging criteria answered, plus the failed benchmark, the constructed price path, the simulated rumour and the pool we control.",
  });
}
