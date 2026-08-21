/**
 * Minimal ESM resolve hook so `node --test` can load the app's own TypeScript
 * sources unchanged.
 *
 * The app is bundled by Next, so its relative imports are extensionless
 * (`./model`). Node's ESM resolver requires an extension. Rewriting every import
 * for the sake of the test runner would make the tested code differ from the
 * shipped code, so instead this hook retries a failed relative specifier with
 * the TypeScript extensions. Node 22.6+ strips the types itself.
 *
 * It also supplies the `type: "json"` import attribute for `.json` specifiers.
 * Next injects that itself, so the app's imports of the frontend handoff carry
 * no attribute and Node refuses them. Adding it here keeps the shipped import
 * statements unchanged, which is the whole point of this file.
 *
 * No dependencies. Only relative specifiers are retried, so a genuinely missing
 * package still fails loudly.
 */
const CANDIDATES = [".ts", ".tsx", "/index.ts", "/index.tsx"];

/**
 * The attribute has to be on the *resolution*, not on the context passed down:
 * Node validates it during `load`, against what `resolve` returned.
 */
function withJsonAttribute(resolution) {
  if (resolution.format === "json" || resolution.url.endsWith(".json")) {
    return { ...resolution, importAttributes: { type: "json" } };
  }
  return resolution;
}

export async function resolve(specifier, context, nextResolve) {
  try {
    return withJsonAttribute(await nextResolve(specifier, context));
  } catch (error) {
    if (!specifier.startsWith(".")) throw error;
    for (const extension of CANDIDATES) {
      try {
        return withJsonAttribute(await nextResolve(specifier + extension, context));
      } catch {
        // try the next candidate
      }
    }
    throw error;
  }
}
