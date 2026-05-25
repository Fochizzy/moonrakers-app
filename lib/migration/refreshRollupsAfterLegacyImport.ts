import { refreshServerAuthoredAnalytics } from "../cloud/analytics/refreshServerAuthoredAnalytics";

type RpcResult = {
  error?: unknown;
};

type RefreshRollupsAfterLegacyImportInput = {
  hostProfileId: string;
  importedGames: number;
};

type RefreshRollupsAfterLegacyImportDeps = {
  callRpc?: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<RpcResult>;
};

export async function refreshRollupsAfterLegacyImport(
  input: RefreshRollupsAfterLegacyImportInput,
  deps: RefreshRollupsAfterLegacyImportDeps = {},
) {
  const hostProfileId = String(input.hostProfileId ?? "").trim();
  if (!hostProfileId) {
    throw new Error("hostProfileId is required to refresh rollups.");
  }

  if (!Number.isFinite(input.importedGames) || input.importedGames < 1) {
    return false;
  }

  const callRpc =
    deps.callRpc ??
    (async (name: string, args: Record<string, unknown>) => {
      const { supabase } = await import("../supabase");
      return supabase.rpc(name, args);
    });

  const result = await callRpc("refresh_rollups_after_legacy_import", {
    target_profile_id: hostProfileId,
  });

  if (result?.error) {
    throw result.error;
  }

  await refreshServerAuthoredAnalytics({
    profileId: hostProfileId,
  });

  return true;
}
