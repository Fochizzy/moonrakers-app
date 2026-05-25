import assert from "node:assert/strict";

import {
  createAppStatusRecord,
  getAppStatusTone,
} from "../lib/app-status/types.ts";

function main() {
  const saving = createAppStatusRecord({
    scope: "cloud_save",
    state: "running",
    title: "Saving game",
  });

  assert.equal(saving.scope, "cloud_save");
  assert.equal(saving.state, "running");
  assert.equal(saving.title, "Saving game");
  assert.equal(typeof saving.timestamp, "number");
  assert.equal(getAppStatusTone(saving), "info");

  const warning = createAppStatusRecord({
    scope: "history_import",
    state: "success_with_warning",
    title: "Backup imported with warnings",
    detail: "Some player names still need mapping.",
  });

  assert.equal(warning.detail, "Some player names still need mapping.");
  assert.equal(getAppStatusTone(warning), "warning");

  const stale = createAppStatusRecord({
    scope: "analytics_refresh",
    state: "stale",
    title: "Showing last successful server payload",
  });

  assert.equal(getAppStatusTone(stale), "warning");

  const failed = createAppStatusRecord({
    scope: "history_delete",
    state: "failed",
    title: "Delete failed",
  });

  assert.equal(getAppStatusTone(failed), "danger");
}

try {
  main();
  console.log("shared-app-status.test.ts passed");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
