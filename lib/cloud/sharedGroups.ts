import type { Group } from "@/store/useStore";

type CreateSharedGroupInput = {
  createdBy: string;
  name: string;
  playerIds: string[];
};

function normalizeGroupCreatedAt(value: string | null | undefined) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

export async function createSharedGroup(input: CreateSharedGroupInput): Promise<Group> {
  const createdBy = String(input.createdBy ?? "").trim();
  const name = String(input.name ?? "").trim();
  const playerIds = Array.from(
    new Set(
      (Array.isArray(input.playerIds) ? input.playerIds : [])
        .map((playerId) => String(playerId ?? "").trim())
        .filter(Boolean),
    ),
  );

  if (!createdBy) {
    throw new Error("Signed-in profile required to create a shared group.");
  }

  if (!name) {
    throw new Error("Group name required.");
  }

  if (playerIds.length < 2) {
    throw new Error("Select at least 2 registered players for a shared group.");
  }

  const { supabase } = await import("../supabase");
  const { data: groupRow, error: groupError } = await supabase
    .from("groups")
    .insert({
      created_by: createdBy,
      name,
    })
    .select("id, name, created_at")
    .single();

  if (groupError) {
    throw groupError;
  }

  const groupId = String(groupRow?.id ?? "").trim();
  if (!groupId) {
    throw new Error("Supabase did not return the new group id.");
  }

  const memberRows = playerIds.map((profileId, index) => ({
    group_id: groupId,
    profile_id: profileId,
    position: index,
  }));

  const { error: membersError } = await supabase.from("group_members").insert(memberRows);

  if (membersError) {
    await supabase.from("groups").delete().eq("id", groupId);
    throw membersError;
  }

  return {
    id: groupId,
    name: String(groupRow?.name ?? name).trim() || name,
    playerIds,
    createdAt: normalizeGroupCreatedAt(groupRow?.created_at),
  };
}

export async function deleteSharedGroup(groupId: string) {
  const normalizedGroupId = String(groupId ?? "").trim();
  if (!normalizedGroupId) {
    return;
  }

  const { supabase } = await import("../supabase");
  const { error } = await supabase.from("groups").delete().eq("id", normalizedGroupId);

  if (error) {
    throw error;
  }
}
