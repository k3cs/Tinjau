import Link from "next/link";
import { DEMO_SCENES, type DemoSceneId } from "@/lib/demo/walkthrough";

export function DemoSceneNav({ selected }: { selected: DemoSceneId }) {
  return (
    <nav aria-label="Demo scenes" className="grid border border-edge md:grid-cols-3">
      {DEMO_SCENES.map((scene, index) => {
        const active = selected === scene.id;
        return (
          <Link
            key={scene.id}
            href={`/demo?scene=${scene.id}${scene.id === "comparison" ? "" : "&stage=listen"}`}
            aria-current={active ? "page" : undefined}
            className={`group min-h-24 px-4 py-4 transition-colors duration-100 ease-tinjau md:border-l md:first:border-l-0 ${
              active ? "bg-signal text-black" : "border-edge bg-canvas text-ink hover:bg-canvas-soft"
            }`}
          >
            <span className="font-data text-[10px] font-semibold uppercase tracking-[0.07em] opacity-70">{scene.label} · 0{index + 1}</span>
            <span className="mt-2 block text-sm font-semibold">{scene.title}</span>
            <span className={`mt-1 block text-xs leading-relaxed ${active ? "text-black/70" : "text-ink-muted"}`}>{scene.summary}</span>
          </Link>
        );
      })}
    </nav>
  );
}
