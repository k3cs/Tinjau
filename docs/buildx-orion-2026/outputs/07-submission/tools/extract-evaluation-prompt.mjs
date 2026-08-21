#!/usr/bin/env node
/**
 * Extracts the send-ready evaluation prompt from its annotated source.
 *
 * `independent-evaluation-prompt.md` carries the prompt inside a fence, wrapped
 * in notes about why it is written the way it is. Those notes are for whoever
 * maintains it. Handing the whole file to the evaluating agent would feed it an
 * argument about the prompt's own neutrality, which is the exact framing the
 * prompt exists to avoid.
 *
 * So the two files are one file: this extracts the fenced body into
 * `EVALUATE-TINJAU.txt`, and running it again after any edit keeps them from
 * drifting. Editing the .txt directly is the one thing that breaks that.
 *
 *   node docs/buildx-orion-2026/outputs/07-submission/tools/extract-evaluation-prompt.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const submission = join(here, "..");

const source = readFileSync(join(submission, "independent-evaluation-prompt.md"), "utf8");

const fence = "````";
const open = source.indexOf(`${fence}text`);
const close = source.indexOf(`\n${fence}`, open + 1);

if (open === -1 || close === -1) {
  console.error("Could not find the prompt fence in independent-evaluation-prompt.md");
  process.exit(1);
}

const body = source.slice(source.indexOf("\n", open) + 1, close).trimEnd();

const out = join(submission, "EVALUATE-TINJAU.txt");
writeFileSync(out, `${body}\n`);

const lines = body.split("\n").length;
console.log(`wrote ${out}`);
console.log(`${lines} lines, ${body.length} characters`);

// The whole point is that no trace of the wrapper survives.
for (const leak of ["Hand the block below", "Three constraints shaped it", "An earlier draft"]) {
  if (body.includes(leak)) {
    console.error(`LEAK: wrapper text reached the extract: ${leak}`);
    process.exitCode = 1;
  }
}
