import { BlindWindow } from "@/app/_components/landing/blind-window";
import { BoundedResponse } from "@/app/_components/landing/bounded-response";
import { DefenseComparison } from "@/app/_components/landing/defense-comparison";
import { LandingCta } from "@/app/_components/landing/landing-cta";
import { LandingHero } from "@/app/_components/landing/landing-hero";
import { MeasuredResult } from "@/app/_components/landing/measured-result";
import { PlainTerms } from "@/app/_components/landing/plain-terms";
import { ProofLedger } from "@/app/_components/landing/proof-ledger";
import { SafetyBoundary } from "@/app/_components/landing/safety-boundary";
import { WhyXLayer } from "@/app/_components/landing/why-x-layer";

/**
 * Problem, response, boundary, result, then the ledger.
 *
 * `SystemStory` was removed rather than trimmed: it restated the pipeline that
 * now sits in the hero as a drawing, and a second telling of the same six steps
 * was the largest block of redundant prose on the site.
 *
 * `PlainTerms` sits second because every section after it assumes the reader
 * knows what a pool is and who loses money when one misprices. That assumption
 * was never stated anywhere, so a first-time reader met the argument before the
 * vocabulary it is made of.
 */
export default function HomePage() {
  return (
    <div className="bg-canvas text-ink">
      <LandingHero />
      <PlainTerms />
      <BlindWindow />
      <BoundedResponse />
      <SafetyBoundary />
      <MeasuredResult />
      <DefenseComparison />
      <WhyXLayer />
      <ProofLedger />
      <LandingCta />
    </div>
  );
}
