import assert from "node:assert/strict";

import {
  createLiveAnalyticsQueryState,
  beginLiveAnalyticsRequest,
  resolveLiveAnalyticsSuccess,
  resolveLiveAnalyticsFailure,
} from "../lib/cloud/analytics/createLiveAnalyticsQuery.ts";

function main() {
  const initial = createLiveAnalyticsQueryState<string>("players:a");

  assert.equal(initial.payload, null);
  assert.equal(initial.loading, false);
  assert.equal(initial.refreshing, false);
  assert.equal(initial.isStale, false);
  assert.equal(initial.error, null);
  assert.equal(initial.staleMessage, null);

  const firstRequest = beginLiveAnalyticsRequest(initial, "players:a");
  assert.equal(firstRequest.loading, true, "expected first request to block-render while loading");
  assert.equal(firstRequest.payload, null);
  assert.equal(firstRequest.refreshing, false);

  const firstSuccess = resolveLiveAnalyticsSuccess(firstRequest, "server-payload-a", 111);
  assert.equal(firstSuccess.loading, false);
  assert.equal(firstSuccess.refreshing, false);
  assert.equal(firstSuccess.payload, "server-payload-a");
  assert.equal(firstSuccess.isStale, false);
  assert.equal(firstSuccess.error, null);
  assert.equal(firstSuccess.staleMessage, null);
  assert.equal(firstSuccess.lastSuccessAt, 111);

  const refocusRefresh = beginLiveAnalyticsRequest(firstSuccess, "players:a");
  assert.equal(
    refocusRefresh.refreshing,
    true,
    "expected a same-key refocus refresh to keep rendering and mark refreshing",
  );
  assert.equal(refocusRefresh.payload, "server-payload-a");
  assert.equal(refocusRefresh.loading, false);

  const staleFailure = resolveLiveAnalyticsFailure(
    refocusRefresh,
    "Supabase timed out",
  );
  assert.equal(staleFailure.payload, "server-payload-a");
  assert.equal(staleFailure.loading, false);
  assert.equal(staleFailure.refreshing, false);
  assert.equal(staleFailure.isStale, true);
  assert.equal(staleFailure.error, null);
  assert.equal(
    staleFailure.staleMessage,
    "Supabase timed out",
    "expected stale failures to keep the last payload and store a visible stale reason",
  );

  const differentPlayerRequest = beginLiveAnalyticsRequest(staleFailure, "players:b");
  assert.equal(
    differentPlayerRequest.payload,
    null,
    "expected a new query key to clear the old player's payload instead of rendering mismatched stale data",
  );
  assert.equal(differentPlayerRequest.loading, true);
  assert.equal(differentPlayerRequest.refreshing, false);
  assert.equal(differentPlayerRequest.isStale, false);

  const hardFailure = resolveLiveAnalyticsFailure(
    differentPlayerRequest,
    "Permission denied",
  );
  assert.equal(hardFailure.payload, null);
  assert.equal(hardFailure.loading, false);
  assert.equal(hardFailure.refreshing, false);
  assert.equal(hardFailure.isStale, false);
  assert.equal(hardFailure.error, "Permission denied");
  assert.equal(hardFailure.staleMessage, null);
}

try {
  main();
  console.log("live-analytics-query.test.ts passed");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
