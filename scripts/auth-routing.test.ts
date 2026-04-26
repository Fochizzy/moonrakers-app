import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  resolveHomeRedirect,
  resolveLaunchRoute,
} from "../lib/auth/launchRoute.ts";

assert.equal(
  resolveLaunchRoute({
    session: null,
    profile: null,
    passwordRecoveryPending: true,
  }),
  "/reset-password",
);

assert.equal(
  resolveLaunchRoute({
    session: { user: { id: "u1" } },
    profile: null,
    passwordRecoveryPending: false,
  }),
  "/register",
);

assert.equal(
  resolveLaunchRoute({
    session: { user: { id: "u1" } },
    profile: { id: "u1", player_name: "izzy" },
    passwordRecoveryPending: false,
  }),
  "/",
);

assert.equal(
  resolveLaunchRoute({
    session: { user: { id: "u1" } },
    profile: { id: "u1", player_name: "izzy" },
    passwordRecoveryPending: false,
  }),
  "/",
);

assert.equal(
  resolveLaunchRoute({
    session: { user: { id: "u1" } },
    profile: { id: "u1", player_name: "izzy" },
    passwordRecoveryPending: true,
  }),
  "/reset-password",
);

assert.equal(
  resolveHomeRedirect({
    authBootstrapStatus: "loading",
    session: null,
    profile: null,
    passwordRecoveryPending: false,
  }),
  null,
);

assert.equal(
  resolveHomeRedirect({
    authBootstrapStatus: "ready",
    session: null,
    profile: null,
    passwordRecoveryPending: false,
  }),
  "/login",
);

assert.equal(
  resolveHomeRedirect({
    authBootstrapStatus: "ready",
    session: { user: { id: "u1" } },
    profile: null,
    passwordRecoveryPending: false,
  }),
  "/register",
);

assert.equal(
  resolveHomeRedirect({
    authBootstrapStatus: "ready",
    session: { user: { id: "u1" } },
    profile: { id: "u1", player_name: "izzy" },
    passwordRecoveryPending: false,
  }),
  null,
);

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const loginScreenSource = fs.readFileSync(
  path.join(projectRoot, "app", "login.tsx"),
  "utf8",
);

assert.match(loginScreenSource, /Create Profile/);
assert.match(loginScreenSource, /Forgot Password/);
assert.match(loginScreenSource, /Send Confirmation Email/);

console.log("auth-routing.test.ts passed");
