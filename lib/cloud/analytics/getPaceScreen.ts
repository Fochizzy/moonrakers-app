import {
  executeAnalyticsReadRpc,
  getDefaultAnalyticsRpcClient,
  resolveAnalyticsCall,
  type AnalyticsRpcClient,
} from "./types.ts";

export type PaceScreenParams = {
  profileId: string;
};

export type PaceScreenPayload = {
  meta?: { generatedAt?: string; source?: string };
  league?: {
    gamesMeasured?: number;
    medianGameSeconds?: number;
    medianTurnSeconds?: number;
    lengthByPlayerCount?: Array<{
      playerCount?: number;
      games?: number;
      medianGameSeconds?: number;
    }>;
  };
  players?: Array<{
    profileId?: string;
    name?: string;
    turns?: number;
    medianTurnSeconds?: number;
    longestTurnSeconds?: number;
    tableShare?: number;
  }>;
};

export async function getPaceScreen(
  params: PaceScreenParams,
): Promise<PaceScreenPayload>;
export async function getPaceScreen(
  client: AnalyticsRpcClient,
  params: PaceScreenParams,
): Promise<PaceScreenPayload>;
export async function getPaceScreen(
  clientOrParams: AnalyticsRpcClient | PaceScreenParams | undefined,
  maybeParams?: PaceScreenParams,
): Promise<PaceScreenPayload> {
  const { client, params } = await resolveAnalyticsCall(
    getDefaultAnalyticsRpcClient,
    clientOrParams,
    maybeParams,
  );
  return executeAnalyticsReadRpc(
    client,
    "get_pace_screen",
    {
      profile_id: params.profileId,
    },
    params.profileId,
  );
}
