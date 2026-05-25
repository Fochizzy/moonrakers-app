import assert from "node:assert/strict";

import { getImmediateProfileUserId } from "../lib/auth/registerFlow.ts";

assert.equal(
  getImmediateProfileUserId({
    session: {
      user: {
        id: "session-user-id",
      },
    },
    user: {
      id: "session-user-id",
    },
  }),
  "session-user-id",
);

assert.equal(
  getImmediateProfileUserId({
    session: null,
    user: {
      id: "signup-user-id",
    },
  }),
  null,
);

assert.equal(
  getImmediateProfileUserId({
    session: null,
    user: null,
  }),
  null,
);

console.log("register-flow.test.ts passed");
