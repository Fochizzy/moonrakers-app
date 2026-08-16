import assert from "node:assert/strict";
import type { AnalyticsRpcClient } from "@moonrakers/analytics-contract";

import { getAnalyticsHome } from "../lib/cloud/analytics/getAnalyticsHome.ts";
import { getChartDataset } from "../lib/cloud/analytics/getChartDataset.ts";
import { getInsightsScreen } from "../lib/cloud/analytics/getInsightsScreen.ts";
import { getStatsScreen } from "../lib/cloud/analytics/getStatsScreen.ts";

type RpcCall = {
  name: string;
  args: Record<string, unknown>;
};

function buildReadonlyFailure() {
  return {
    data: null,
    error: {
      message: "cannot execute INSERT in a read-only transaction",
    },
  };
}

async function assertReadRecovery<TPayload>({
  description,
  readRpcName,
  readRpcArgs,
  successPayload,
  run,
}: {
  description: string;
  readRpcName: string;
  readRpcArgs: Record<string, unknown>;
  successPayload: TPayload;
  run: (client: AnalyticsRpcClient) => Promise<TPayload>;
}) {
  const rpcCalls: RpcCall[] = [];
  let readAttempts = 0;
  const client: AnalyticsRpcClient = {
    async rpc<TResponse>(name: string, args: Record<string, unknown>) {
      rpcCalls.push({ name, args });
      if (name === readRpcName) {
        readAttempts += 1;
        if (readAttempts === 1) {
          return buildReadonlyFailure();
        }

        return {
          data: successPayload as TResponse,
          error: null,
        };
      }

      if (name === "refresh_server_authored_analytics") {
        return {
          data: { ok: true } as TResponse,
          error: null,
        };
      }

      throw new Error(`${description}: unexpected RPC ${name}`);
    },
  };

  const payload = await run(client);

  assert.deepEqual(
    payload,
    successPayload,
    `${description}: expected the second read attempt to return the payload`,
  );
  assert.deepEqual(
    rpcCalls,
    [
      {
        name: readRpcName,
        args: readRpcArgs,
      },
      {
        name: "refresh_server_authored_analytics",
        args: {
          target_profile_id: readRpcArgs.profile_id,
        },
      },
      {
        name: readRpcName,
        args: readRpcArgs,
      },
    ],
    `${description}: expected a refresh between the failed read and retry`,
  );
}

async function main() {
  await assertReadRecovery({
    description: "analytics home",
    readRpcName: "get_analytics_home",
    readRpcArgs: {
      profile_id: "home-profile",
      focus_player_id: null,
    },
    successPayload: {
      generatedAt: "2026-05-24T00:00:00.000Z",
      hero: {
        players: 3,
        games: 9,
        views: 2,
      },
      cards: [],
    },
    run: (client) =>
      getAnalyticsHome(client, {
        profileId: "home-profile",
      }),
  });

  await assertReadRecovery({
    description: "stats screen",
    readRpcName: "get_stats_screen",
    readRpcArgs: {
      profile_id: "stats-profile",
      focus_player_id: null,
    },
    successPayload: {
      generatedAt: "2026-05-24T00:00:00.000Z",
      overview: {
        hero: {
          players: 3,
          games: 9,
          takeaway: "Nova leads",
        },
        cards: [],
        topSignals: [],
      },
      players: {
        options: [],
        selectedPlayerId: null,
        detail: null,
      },
      playstyle: {},
      correlations: {},
      games: {},
    },
    run: (client) =>
      getStatsScreen(client, {
        profileId: "stats-profile",
        focusPlayerId: null,
      }),
  });

  await assertReadRecovery({
    description: "insights screen",
    readRpcName: "get_insights_screen",
    readRpcArgs: {
      profile_id: "insights-profile",
    },
    successPayload: {
      generatedAt: "2026-05-24T00:00:00.000Z",
      meta: {
        games: 5,
      },
      cards: [],
      topSignals: [],
      relationships: {},
      correlations: {},
    },
    run: (client) =>
      getInsightsScreen(client, {
        profileId: "insights-profile",
      }),
  });

  await assertReadRecovery({
    description: "chart dataset",
    readRpcName: "get_chart_dataset",
    readRpcArgs: {
      chart_key: "elo",
      profile_id: "chart-profile",
      focus_player_id: "player-1",
      compare_player_id: "player-2",
      scoped_player_ids: ["player-1", "player-2"],
      selected_game_id: null,
      metric_key: "totalPrestige",
      line_mode: "raw",
      graph_mode: null,
      opponent_id: null,
    },
    successPayload: {
      chartKey: "elo",
      generatedAt: "2026-05-24T00:00:00.000Z",
      data: {},
    },
    run: (client) =>
      getChartDataset(client, {
        chartKey: "elo",
        profileId: "chart-profile",
        focusPlayerId: "player-1",
        comparePlayerId: "player-2",
        scopedPlayerIds: ["player-1", "player-2"],
        selectedGameId: null,
        metricKey: "totalPrestige",
        lineMode: "raw",
        graphMode: null,
        opponentId: null,
      }),
  });

  await assert.rejects(
    () =>
      getStatsScreen(
        {
          async rpc<_TPayload>(name: string) {
            if (name !== "get_stats_screen") {
              throw new Error(`unexpected RPC ${name}`);
            }

            return {
              data: null,
              error: {
                message: "permission denied",
              },
            };
          },
        } satisfies AnalyticsRpcClient,
        {
          profileId: "stats-profile",
          focusPlayerId: null,
        },
      ),
    /get_stats_screen failed: permission denied/i,
    "expected non-read-only failures to bubble without forcing a refresh",
  );
}

main()
  .then(() => {
    console.log("analytics-readonly-recovery.test.ts passed");
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
