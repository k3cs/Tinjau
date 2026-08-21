import type { Metadata } from "next";

import { DecisionMethod } from "./_components/decision-method";
import { RiskConsole } from "./_components/risk-console";

export const metadata: Metadata = {
  title: "How Tinjau decides · Tinjau",
  description:
    "What the model is used for, what it is never allowed to do, and two frozen cases followed from the news that arrived to the fee the pool charged.",
};

/**
 * Method first, then two worked examples of it.
 *
 * The console was the whole page, which meant a reader met a `WATCH` record
 * before anything had told them why a model is involved at all or what stops it
 * acting. `DecisionMethod` answers both in three drawings, and the console
 * becomes what it always was: the method, run twice, with every value read from
 * the published handoff.
 */
export default function RiskPage() {
  return (
    <div className="bg-canvas text-ink">
      <DecisionMethod />
      <RiskConsole />
    </div>
  );
}
