import assert from "node:assert/strict";

import { deleteCompletedGame } from "../lib/game-save/deleteCompletedGame.ts";

async function main() {
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const client = {
    async rpc(name: string, args: Record<string, unknown>) {
      rpcCalls.push({ name, args });
      return { data: "deleted-game-id", error: null };
    },
  };

  const deletedGameId = await deleteCompletedGame("game-123", {
    supabaseClient: client as any,
  });

  assert.equal(deletedGameId, "deleted-game-id");
  assert.deepEqual(rpcCalls, [
    {
      name: "delete_completed_game",
      args: {
        target_game_id: "game-123",
      },
    },
  ]);
}

main()
  .then(() => {
    console.log("delete-completed-game-contract.test.ts passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
