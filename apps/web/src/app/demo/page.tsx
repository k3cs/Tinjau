import type { Metadata } from "next";
import { DemoExperience } from "./_components/demo-experience";

export const metadata: Metadata = {
  title: "Guided demo · Tinjau",
  description: "Trace rumor containment, conditional bounded protection, and the matched-input policy comparison across the complete Tinjau system.",
};

export default function DemoPage() {
  return <DemoExperience />;
}
