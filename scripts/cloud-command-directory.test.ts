import assert from "node:assert/strict";

import { buildCloudPlayableCommandDirectory } from "../utils/registeredProfilePlayer.ts";

const GREG_ID = "11111111-1111-4111-8111-111111111111";
const IZZY_ID = "22222222-2222-4222-8222-222222222222";
const CLOUD_GROUP_ID = "33333333-3333-4333-8333-333333333333";

const commandDirectory = buildCloudPlayableCommandDirectory(
  [
    { id: "local-greg", name: "Greg" },
    { id: GREG_ID, name: "Greg", color: "green" },
    { id: "local-corey", name: "Corey" },
    { id: IZZY_ID, name: "Izzy", color: "purple" },
  ],
  [
    {
      id: "local-group",
      name: "Legacy Table",
      playerIds: ["local-greg", "local-corey"],
    },
    {
      id: CLOUD_GROUP_ID,
      name: "Cloud Table",
      playerIds: [GREG_ID, IZZY_ID],
    },
  ],
);

assert.deepEqual(
  commandDirectory.players.map((player) => player.id),
  [GREG_ID, IZZY_ID],
  "expected the command roster to keep only cloud-registered player ids",
);

assert.equal(
  commandDirectory.aliases["local-greg"],
  GREG_ID,
  "expected duplicate local player ids to alias onto their registered profile ids",
);

assert.deepEqual(
  commandDirectory.groups.map((group) => group.id),
  [CLOUD_GROUP_ID],
  "expected the command roster to exclude local-only saved groups",
);

assert.deepEqual(
  commandDirectory.groups[0]?.playerIds,
  [GREG_ID, IZZY_ID],
  "expected cloud-playable groups to keep registered player ids",
);

console.log("cloud-command-directory.test.ts passed");
