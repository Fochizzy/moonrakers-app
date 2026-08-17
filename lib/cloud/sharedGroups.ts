import type { Group } from "@/store/useStore";

type CreateSharedGroupInput = {
  createdBy: string;
  name: string;
  playerIds: string[];
};

type CreateVerifiedSharedGroupInput = CreateSharedGroupInput & {
  draftId: string;
};

type AuthorizeSharedGroupInput = {
  groupId: string;
  draftId: string;
};

function normalizeGroupCreatedAt(value: string | null | undefined) {
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function normalizePlayerIds(playerIds: string[]) {
  return Array.from(
    new Set(
      (Array.isArray(playerIds) ? playerIds : [])
        .map((playerId) => String(playerId ?? "").trim())
        .filter(Boolean),
    ),
  );
}

export async function createSharedGroup(input: CreateSharedGroupInput): Promise<Group> {
  const createdBy = String(input.createdBy ?? "").trim();
  const name = String(input.name ?? "").trim();
  const playerIds = normalizePlayerIds(input.playerIds);

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

export async function createVerifiedSharedGroup(
  input: CreateVerifiedSharedGroupInput,
): Promise<Group> {
  const createdBy = String(input.createdBy ?? "").trim();
  const draftId = String(input.draftId ?? "").trim();
  const name = String(input.name ?? "").trim();
  const playerIds = normalizePlayerIds(input.playerIds);

  if (!createdBy || !draftId) {
    throw new Error("Signed-in profile and group verification draft are required.");
  }

  if (!name) {
    throw new Error("Group name required.");
  }

  if (playerIds.length < 2 || playerIds.length > 5) {
    throw new Error("Select 2 to 5 players for a shared group.");
  }

  if (!playerIds.includes(createdBy)) {
    throw new Error("The signed-in player must be in the shared group.");
  }

  const { supabase } = await import("../supabase");
  const { data, error } = await supabase.rpc("create_verified_group", {
    p_draft_id: draftId,
    p_name: name,
    p_profile_ids: playerIds,
  });

  if (error) {
    throw error;
  }

  const row = data as {
    id?: unknown;
    name?: unknown;
    created_at?: unknown;
    player_ids?: unknown;
  } | null;
  const groupId = String(row?.id ?? "").trim();

  if (!groupId) {
    throw new Error("Supabase did not return the new group id.");
  }

  const returnedPlayerIds = Array.isArray(row?.player_ids)
    ? normalizePlayerIds(row.player_ids.map((playerId) => String(playerId ?? "")))
    : playerIds;

  return {
    id: groupId,
    name: String(row?.name ?? name).trim() || name,
    playerIds: returnedPlayerIds,
    createdAt: normalizeGroupCreatedAt(
      typeof row?.created_at === "string" ? row.created_at : null,
    ),
  };
}

export async function isGroupFastSetupAuthorized(groupId: string) {
  const normalizedGroupId = String(groupId ?? "").trim();
  if (!normalizedGroupId) {
    return false;
  }

  const { supabase } = await import("../supabase");
  const { data, error } = await supabase.rpc(
    "is_group_authorized_for_fast_setup",
    { p_group_id: normalizedGroupId },
  );

  if (error) {
    throw error;
  }

  return data === true;
}

export async function authorizeSharedGroupForFastSetup(
  input: AuthorizeSharedGroupInput,
) {
  const groupId = String(input.groupId ?? "").trim();
  const draftId = String(input.draftId ?? "").trim();

  if (!groupId || !draftId) {
    throw new Error("Group and verification draft are required.");
  }

  const { supabase } = await import("../supabase");
  const { data, error } = await supabase.rpc("authorize_group_for_fast_setup", {
    p_draft_id: draftId,
    p_group_id: groupId,
  });

  if (error) {
    throw error;
  }

  if (data !== true) {
    throw new Error("The group could not be authorized for fast setup.");
  }
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
