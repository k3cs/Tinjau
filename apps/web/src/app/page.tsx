import { BlindWindow } from "@/app/_components/landing/blind-window";
import { DefenseComparison } from "@/app/_components/landing/defense-comparison";
import { LandingCta } from "@/app/_components/landing/landing-cta";
import { LandingHero } from "@/app/_components/landing/landing-hero";
import { ProofLedger } from "@/app/_components/landing/proof-ledger";
import { SafetyBoundary } from "@/app/_components/landing/safety-boundary";
import { SystemStory } from "@/app/_components/landing/system-story";
import { WhyXLayer } from "@/app/_components/landing/why-x-layer";

export default function HomePage() {
  return (
    <div className="bg-paper text-coal">
      <LandingHero />
      <BlindWindow />
      <DefenseComparison />
      <SystemStory />
      <SafetyBoundary />
      <WhyXLayer />
      <ProofLedger />
      <LandingCta />
    </div>
  );
}
