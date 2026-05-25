import { buildCompletedGamePayload } from "./buildCompletedGamePayload";
import { refreshServerAuthoredAnalytics } from "../cloud/analytics/refreshServerAuthoredAnalytics";

export async function saveCompletedGame(input: Parameters<typeof buildCompletedGamePayload>[0]) {
  const payload = buildCompletedGamePayload(input);
  const { supabase } = await import("../supabase");
  const { data, error } = await supabase.rpc("save_completed_game", {
    payload,
  });

  if (error) {
    throw error;
  }

  await refreshServerAuthoredAnalytics({
    profileId: input.hostProfileId,
  });

  return data;
}
