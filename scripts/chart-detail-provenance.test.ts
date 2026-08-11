import assert from "node:assert/strict";

import { resolveChartDetailProvenance } from "../lib/charts/chartDetailProvenance.ts";

function main() {
  const freshServer = resolveChartDetailProvenance({
    hasServerPayload: true,
    isStale: false,
    usingCloudFallbackData: false,
  });

  assert.equal(freshServer.kind, "server");
  // Same wording as every other analytics surface, via buildAnalyticsFreshnessPresentation.
  assert.equal(freshServer.label, "Server data");

  const staleLabel = resolveChartDetailProvenance({
    hasServerPayload: true,
    isStale: true,
    usingCloudFallbackData: false,
  }).label;

  assert.equal(staleLabel, "Stale server data");

  const staleServer = resolveChartDetailProvenance({
    hasServerPayload: true,
    isStale: true,
    usingCloudFallbackData: false,
    staleMessage: "Timed out",
  });

  assert.equal(staleServer.kind, "server-stale");
  assert.match(staleServer.caption, /Timed out/);

  const supabaseFallback = resolveChartDetailProvenance({
    hasServerPayload: false,
    isStale: false,
    usingCloudFallbackData: true,
  });

  assert.equal(supabaseFallback.kind, "supabase-fallback");

  const deviceFallback = resolveChartDetailProvenance({
    hasServerPayload: false,
    isStale: false,
    usingCloudFallbackData: false,
  });

  assert.equal(deviceFallback.kind, "device-fallback");
}

try {
  main();
  console.log("chart-detail-provenance.test.ts passed");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
