import { describe, expect, it } from "vitest";

import { patchWorkerCode } from "./repair-opennext-worker.mjs";

describe("patchWorkerCode", () => {
  it("replaces the middleware handoff with a direct server handler call", () => {
    const originalCode = `// @ts-expect-error: Will be resolved by wrangler build
import { handler as middlewareHandler } from "./middleware/handler.mjs";

export default {
  async fetch(request, env, ctx) {
            // - \`Request\`s are handled by the Next server
            const reqOrResp = await middlewareHandler(request, env, ctx);
            if (reqOrResp instanceof Response) {
                return reqOrResp;
            }
            // @ts-expect-error: resolved by wrangler build
            const { handler } = await import("./server-functions/default/handler.mjs");
            return handler(reqOrResp, env, ctx, request.signal);
  },
};
`;

    const patchedCode = patchWorkerCode(originalCode);

    expect(patchedCode).not.toContain('middlewareHandler } from "./middleware/handler.mjs"');
    expect(patchedCode).toContain(
      'const { handler } = await import("./server-functions/default/handler.mjs");',
    );
    expect(patchedCode).toContain(
      "return handler(request, env, ctx, request.signal);",
    );
  });

  it("leaves an already patched worker unchanged", () => {
    const workerCode = `export default {
  async fetch(request, env, ctx) {
            // Requests are handled directly by the server bundle.
            // Route protection happens in the Next server layer for this dashboard.
            // @ts-expect-error: resolved by wrangler build
            const { handler } = await import("./server-functions/default/handler.mjs");
            return handler(request, env, ctx, request.signal);
  },
};
`;

    expect(patchWorkerCode(workerCode)).toBe(workerCode);
  });
});
