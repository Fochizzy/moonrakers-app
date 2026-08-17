import { supabase } from "@/lib/supabase";
import { normalizeRegisteredProfiles } from "./normalizeRegisteredProfiles";
import { isDeletedAtColumnMissingError } from "./profileSoftDeleteCompat";

function isPasscodeDirectoryUnavailableError(error: unknown) {
  const code = String(
    (error as { code?: unknown } | null | undefined)?.code ?? "",
  ).toUpperCase();
  const message = String(
    (error as { message?: unknown } | null | undefined)?.message ?? error ?? "",
  ).toLowerCase();

  return (
    code === "42501" ||
    code === "42883" ||
    code === "PGRST202" ||
    message.includes("permission denied for function list_passcode_protected_profiles") ||
    (message.includes("list_passcode_protected_profiles") &&
      (message.includes("does not exist") || message.includes("schema cache")))
  );
}

export async function loadRegisteredProfiles() {
  let { data, error } = await supabase
    .from("profiles")
    .select("id, player_name, display_name, favorite_color, assigned_card_art_index, is_guest")
    .is("deleted_at", null)
    .order("player_name", { ascending: true });

  if (isDeletedAtColumnMissingError(error)) {
    ({ data, error } = await supabase
      .from("profiles")
      .select("id, player_name, display_name, favorite_color, assigned_card_art_index, is_guest")
      .order("player_name", { ascending: true }));
  }

  if (error) {
    throw error;
  }

  const { data: protectedProfiles, error: protectedProfilesError } =
    await supabase.rpc("list_passcode_protected_profiles");

  if (
    protectedProfilesError &&
    !isPasscodeDirectoryUnavailableError(protectedProfilesError)
  ) {
    throw protectedProfilesError;
  }

  const protectedProfileIds = new Set(
    (protectedProfilesError || !Array.isArray(protectedProfiles)
      ? []
      : protectedProfiles
    ).map((row) =>
      String((row as { profile_id?: unknown })?.profile_id ?? "").trim(),
    ),
  );

  return normalizeRegisteredProfiles(
    (data ?? []).map((row) => ({
      ...row,
      has_passcode: protectedProfileIds.has(String(row.id ?? "").trim()),
    })),
  );
}
