/**
 * Minimal ESM resolve hook so `node --test` can load the app's own TypeScript
 * sources unchanged.
 *
 * The app is bundled by Next, so its relative imports are extensionless
 * (`./model`). Node's ESM resolver requires an extension. Rather than rewriting
 * every import for the sake of the test runner — which would make the tested
 * code differ from the shipped code — this hook retries a failed relative
 * specifier with the TypeScript extensions. Node 22.6+ strips the types itself.
 *
 * No dependencies. Only relative specifiers are retried, so a genuinely missing
 * package still fails loudly.
 */
const CANDIDATES = [".ts", ".tsx", "/index.ts", "/index.tsx"];

export async function resolve(specifier, context, nextResolve) {
  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (!specifier.startsWith(".")) throw error;
    for (const extension of CANDIDATES) {
      try {
        return await nextResolve(specifier + extension, context);
      } catch {
        // try the next candidate
      }
    }
    throw error;
  }
}
