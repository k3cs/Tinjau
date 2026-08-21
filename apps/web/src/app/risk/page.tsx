import type { Metadata } from "next";

import { RiskConsole } from "./_components/risk-console";

export const metadata: Metadata = {
  title: "Risk state · Tinjau",
  description:
    "Why Tinjau chose NORMAL, WATCH or PROTECT: the evidence, the market check, the bounded action, and the limits the AI cannot move.",
};

export default function RiskPage() {
  return <RiskConsole />;
}
