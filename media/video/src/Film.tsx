import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { C, FONT } from "./theme";
import { CUES } from "./subtitles";
import { SHOTS } from "./timing";
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

/**
 * The whole film in one composition, so the subtitle track is a layer over the beats
 * rather than something burned on afterwards. Rendering here also removes the ffmpeg
 * concat step: `npx remotion render Film out/tinjau-cut.mp4` is the whole build.
 */

const COMPONENTS = [
  Beat01, Beat02, Beat03, Beat04, Beat05, Beat06,
  Beat07, Beat08, Beat09, Beat10, Beat11, Beat12,
] as const;

export { FILM_FRAMES } from "./timing";

/** The band the beats keep clear. Every disclosure line sits above `BAND_TOP`. */
const BAND_TOP = 966;

/**
 * The subtitle band.
 *
 * It is a designed band rather than floating text with a drop shadow: a hairline, a
 * solid carbon field beneath it, and the sentence set in the body face at reading size.
 * The band is opaque because the beats were re-laid out to end above it — nothing is
 * ever covered, so nothing needs to show through.
 *
 * Cues do not cross beat boundaries, so a line is never held over the wrong picture.
 */
const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const cue = CUES.find((c) => frame >= c.from && frame < c.to);

  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: BAND_TOP,
          width: 1920,
          height: 1080 - BAND_TOP,
          background: C.carbon,
          borderTop: `1px solid ${C.rule}`,
        }}
      />
      {cue ? (
        <div
          style={{
            position: "absolute",
            left: 160,
            right: 160,
            top: BAND_TOP + 26,
            textAlign: "center",
            fontFamily: FONT.body,
            fontSize: 32,
            fontWeight: 400,
            lineHeight: 1.3,
            letterSpacing: "-0.005em",
            color: C.paper,
          }}
        >
          {cue.text}
        </div>
      ) : null}
    </>
  );
};

export const Film: React.FC = () => {
  let at = 0;
  return (
    <AbsoluteFill style={{ background: C.carbon }}>
      {SHOTS.map((shot, i) => {
        const from = at;
        at += shot.frames;
        const Shot = COMPONENTS[i];
        return (
          <Sequence key={i} from={from} durationInFrames={shot.frames}>
            <Shot />
          </Sequence>
        );
      })}
      <Subtitles />
    </AbsoluteFill>
  );
};
