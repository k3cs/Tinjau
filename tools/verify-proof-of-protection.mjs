#!/usr/bin/env node
/**
 * Thin launcher for the T5.5 Proof of Protection verifier.
 *
 * `media/thread2/card-04.html` prints `node tools/verify-proof-of-protection.mjs`
 * and that card appears in beat 09 of the demo video, at the exact moment the film
 * asks to be believed. The path it printed did not exist, so anyone who typed it got
 * MODULE_NOT_FOUND. Rather than re-render the card and let the shorter, more
 * memorable path stay broken, the path now exists and forwards to the real verifier,
 * which stays where every other build artifact lives.
 *
 * Exit code, stdout and stderr are the real script's. Nothing is wrapped or filtered.
 */
import { pathToFileURL } from "node:url";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const real = resolve(
  here,
  "../docs/buildx-orion-2026/outputs/05-build/tools/verify-proof-of-protection.mjs",
);

await import(pathToFileURL(real).href);
