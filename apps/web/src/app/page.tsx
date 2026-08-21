import { BlindWindow } from "@/app/_components/landing/blind-window";
import { LandingCta } from "@/app/_components/landing/landing-cta";
import { LandingHero } from "@/app/_components/landing/landing-hero";
import { MeasuredResult } from "@/app/_components/landing/measured-result";
import { PlainTerms } from "@/app/_components/landing/plain-terms";
import { WhyItMattersTeaser } from "@/app/_components/landing/why-it-matters-teaser";
import { WhyXLayer } from "@/app/_components/landing/why-x-layer";

/**
 * Problem, vocabulary, evidence that the problem is real, the honest result,
 * the chain, and out.
 *
 * This page used to run ten sections and carried the whole product argument by
 * itself, including three that were really engineering explanations: the
 * containment rule and the fee lifecycle, the authority boundary, and the
 * architecture comparison. They are not weaker material, they are simply
 * answering "how does it work", which is a question a reader only asks after
 * deciding they care. They moved to `/risk` and `/proof` where that reader
 * arrives already asking it.
 *
 * What is left is the argument a first-time visitor needs in order: something
 * costs money (`WhyItMattersTeaser`, the only measured claim here about a market
 * we do not own), here is the vocabulary to follow it (`PlainTerms`), here is
 * the shape of it (`BlindWindow`), and here is the result we got, including the
 * part that went against us (`MeasuredResult`).
 */
export default function HomePage() {
  return (
    <div className="bg-canvas text-ink">
      <LandingHero />
      <PlainTerms />
      <BlindWindow />
      <WhyItMattersTeaser />
      <MeasuredResult />
      <WhyXLayer />
      <LandingCta />
    </div>
  );
}
