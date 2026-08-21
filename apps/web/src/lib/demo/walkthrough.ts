export const DEMO_SCENES = [
  { id: "rumor", label: "Scene A", title: "Rumor containment", summary: "X-shaped rumor → WATCH → aggressive fee blocked" },
  { id: "confirmed", label: "Scene B", title: "Confirmed-event path", summary: "Official evidence → market gate → bounded target path" },
  { id: "comparison", label: "Scene C", title: "Policy comparison", summary: "Matched input → three policies → no predetermined winner" },
] as const;

export type DemoSceneId = (typeof DEMO_SCENES)[number]["id"];

export const DEMO_STAGES = [
  { id: "listen", index: "01", label: "Listen", output: "Potential evidence enters" },
  { id: "retrieve", index: "02", label: "Retrieve", output: "Source and timestamp preserved" },
  { id: "understand", index: "03", label: "Understand", output: "Claim and asset normalized" },
  { id: "relate", index: "04", label: "Relate", output: "Support, conflict, duplicate" },
  { id: "decide", index: "05", label: "Decide", output: "Deterministic risk state" },
  { id: "confirm", index: "06", label: "Confirm", output: "OKX / X Layer market gate" },
  { id: "record", index: "07", label: "Record", output: "Versioned risk record" },
  { id: "act", index: "08", label: "Act", output: "Bounded fee and publication" },
  { id: "recover", index: "09", label: "Recover", output: "Expiry and deterministic decay" },
] as const;

export type DemoStageId = (typeof DEMO_STAGES)[number]["id"];

export function getScene(id?: string): DemoSceneId {
  return DEMO_SCENES.some((scene) => scene.id === id) ? (id as DemoSceneId) : "rumor";
}

export function getStage(id?: string): DemoStageId {
  return DEMO_STAGES.some((stage) => stage.id === id) ? (id as DemoStageId) : "listen";
}

export function getStageIndex(id: DemoStageId): number {
  return DEMO_STAGES.findIndex((stage) => stage.id === id);
}
