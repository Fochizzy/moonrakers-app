import type { GameDraft } from "@/lib/game-draft/types";
import { supabase } from "@/lib/supabase";

import { normalizeGameDraftRow } from "./normalizeGameDraftRow";

export async function saveUserGameDraft(draft: GameDraft): Promise<GameDraft | null> {
  const profileId = String(draft?.profileId ?? "").trim();
  const draftId = String(draft?.draftId ?? "").trim();

  if (!profileId) {
    throw new Error("Signed-in profile required to save a game draft.");
  }

  if (!draftId) {
    throw new Error("Draft id required to save a game draft.");
  }

  const { data, error } = await supabase
    .from("user_game_drafts")
    .upsert(
      {
        profile_id: profileId,
        draft_id: draftId,
        phase: draft.phase,
        revision: Number(draft.revision ?? 0),
        updated_at: new Date(draft.updatedAt ?? Date.now()).toISOString(),
        device_updated_at: new Date(draft.deviceUpdatedAt ?? Date.now()).toISOString(),
        payload: {
          selectedPlayerIds: Array.isArray(draft.selectedPlayerIds) ? draft.selectedPlayerIds : [],
          selectedGroupId: draft.selectedGroupId ?? null,
          selectedGroupName: draft.selectedGroupName ?? null,
          turnOrder: Array.isArray(draft.turnOrder) ? draft.turnOrder : [],
          playerSnapshots: Array.isArray(draft.playerSnapshots) ? draft.playerSnapshots : [],
          gameplay: draft.gameplay ?? null,
        },
      },
      { onConflict: "profile_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return normalizeGameDraftRow(data);
}
