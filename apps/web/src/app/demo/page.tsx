import type { Metadata } from "next";
import { DemoExperience } from "./_components/demo-experience";

export const metadata: Metadata = {
  title: "Guided Demo — Tinjau",
  description: "Trace rumor containment, conditional bounded protection, and the matched-input policy comparison across the complete Tinjau system.",
};

type DemoPageProps = { searchParams: Promise<{ scene?: string; stage?: string; case?: string }> };

export default async function DemoPage({ searchParams }: DemoPageProps) {
  const params = await searchParams;
  return <DemoExperience sceneParam={params.scene} stageParam={params.stage} caseId={params.case} />;
}
