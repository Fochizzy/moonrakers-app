// Node ESM resolve hook that maps the app's "@/" import alias onto the repo
// root, so .test.ts files (run with Node's native type stripping) can load
// app modules the same way Metro and tsc do.
//
// Used via:  node --import ./scripts/support/register-alias.mjs <test file>
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

const EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs", ".cjs"];

function resolveAliasTarget(specifier) {
  const base = path.join(root, specifier.slice(2));
  const candidates = [base];
  for (const ext of EXTENSIONS) candidates.push(base + ext);
  for (const ext of EXTENSIONS) candidates.push(path.join(base, "index" + ext));

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return pathToFileURL(candidate).href;
    }
  }

  return null;
}

export function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith("@/")) {
    const target = resolveAliasTarget(specifier);
    if (target) {
      return nextResolve(target, context);
    }
  }

  return nextResolve(specifier, context);
}
