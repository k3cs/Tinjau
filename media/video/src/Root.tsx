import React from "react";
import { Composition } from "remotion";
import { loadFont as loadDisplay } from "@remotion/google-fonts/InterTight";
import { loadFont as loadBody } from "@remotion/google-fonts/Inter";
import { loadFont as loadData } from "@remotion/google-fonts/JetBrainsMono";
import { Beat01 } from "./Beat01";
import { Beat02 } from "./Beat02";
import { Beat03 } from "./Beat03";
import { Beat04 } from "./Beat04";
import { Beat05 } from "./Beat05";
import { Beat06 } from "./Beat06";
import { Beat07 } from "./Beat07";
import { Beat08 } from "./Beat08";
import { Beat09 } from "./Beat09";
import { Beat10 } from "./Beat10";
import { Beat11 } from "./Beat11";
import { Beat12 } from "./Beat12";
import { Film } from "./Film";
import { FILM_FRAMES, SHOTS } from "./timing";

// brand.md allows at most three weights on a surface. Naming them explicitly also
// keeps the font fetch to a handful of requests instead of the full family.
const subsets = ["latin"] as const;
loadDisplay("normal", { subsets: [...subsets], weights: ["600"] });
loadBody("normal", { subsets: [...subsets], weights: ["400", "500"] });
loadData("normal", { subsets: [...subsets], weights: ["400", "500"] });

const COMPONENTS = [
  Beat01, Beat02, Beat03, Beat04, Beat05, Beat06,
  Beat07, Beat08, Beat09, Beat10, Beat11, Beat12,
] as const;

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="Film"
      component={Film}
      durationInFrames={FILM_FRAMES}
      fps={30}
      width={1920}
      height={1080}
    />
    {SHOTS.map((b, i) => (
      <Composition
        key={b.id}
        id={b.id}
        component={COMPONENTS[i]}
        durationInFrames={b.frames}
        fps={30}
        width={1920}
        height={1080}
      />
    ))}
  </>
);
