import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const MIDDLEWARE_IMPORT =
  /\/\/ @ts-expect-error: Will be resolved by wrangler build\r?\nimport \{ handler as middlewareHandler \} from "\.\/middleware\/handler\.mjs";\r?\n/;
const MIDDLEWARE_BLOCK =
  /\/\/ - `Request`s are handled by the Next server\r?\n\s*const reqOrResp = await middlewareHandler\(request, env, ctx\);\r?\n\s*if \(reqOrResp instanceof Response\) \{\r?\n\s*return reqOrResp;\r?\n\s*\}\r?\n\s*\/\/ @ts-expect-error: resolved by wrangler build\r?\n\s*const \{ handler \} = await import\("\.\/server-functions\/default\/handler\.mjs"\);\r?\n\s*return handler\(reqOrResp, env, ctx, request\.signal\);/;
const DIRECT_HANDLER_BLOCK = [
  "            // Requests are handled directly by the server bundle.",
  "            // Route protection happens in the Next server layer for this dashboard.",
  "            // @ts-expect-error: resolved by wrangler build",
  '            const { handler } = await import("./server-functions/default/handler.mjs");',
  "            return handler(request, env, ctx, request.signal);",
].join("\n");

export function patchWorkerCode(originalCode) {
  if (
    !originalCode.includes('import { handler as middlewareHandler } from "./middleware/handler.mjs";') &&
    originalCode.includes("return handler(request, env, ctx, request.signal);")
  ) {
    return originalCode;
  }

  const withoutMiddlewareImport = originalCode.replace(MIDDLEWARE_IMPORT, "");
  const patchedCode = withoutMiddlewareImport.replace(
    MIDDLEWARE_BLOCK,
    DIRECT_HANDLER_BLOCK,
  );

  if (patchedCode === originalCode) {
    throw new Error(
      "Could not patch .open-next/worker.js because the generated middleware block changed.",
    );
  }

  if (patchedCode.includes('import { handler as middlewareHandler } from "./middleware/handler.mjs";')) {
    throw new Error("Worker patch left the middleware import in place.");
  }

  return patchedCode;
}

export function repairOpenNextWorker(projectRoot = process.cwd()) {
  const workerPath = path.join(projectRoot, ".open-next", "worker.js");
  const middlewareDir = path.join(projectRoot, ".open-next", "middleware");

  if (!existsSync(workerPath)) {
    return false;
  }

  const originalCode = readFileSync(workerPath, "utf8");
  const patchedCode = patchWorkerCode(originalCode);

  if (patchedCode !== originalCode) {
    writeFileSync(workerPath, patchedCode, "utf8");
  }

  if (existsSync(middlewareDir)) {
    rmSync(middlewareDir, { force: true, recursive: true });
  }

  return patchedCode !== originalCode;
}

const executedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : null;

if (
  executedPath &&
  import.meta.url === executedPath
) {
  repairOpenNextWorker();
}
