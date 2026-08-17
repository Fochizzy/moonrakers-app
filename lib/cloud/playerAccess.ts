import { supabase } from "@/lib/supabase";

export const PLAYER_PASSCODE_PATTERN = /^[a-z0-9]{3,8}$/i;
export const PLAYER_USERNAME_PATTERN = /^[A-Za-z0-9_-]{3,20}$/;

export function isValidPlayerPasscode(value: string) {
  return PLAYER_PASSCODE_PATTERN.test(value.trim());
}

export function isValidPlayerUsername(value: string) {
  return PLAYER_USERNAME_PATTERN.test(value.trim());
}

export type CreatedGuestProfile = {
  id: string;
  player_name: string;
  favorite_color?: string | null;
  assigned_card_art_index?: number | null;
  is_guest: true;
};

export async function createGuestProfile(input: {
  username: string;
  passcode: string;
}) {
  const { data, error } = await supabase.rpc("create_guest_profile", {
    p_player_name: input.username.trim(),
    p_passcode: input.passcode.trim(),
  });

  if (error) {
    throw error;
  }

  return data as CreatedGuestProfile;
}

export async function verifyPlayerForGame(input: {
  draftId: string;
  profileId: string;
  passcode: string;
}) {
  const { data, error } = await supabase.rpc("verify_player_passcode", {
    p_draft_id: input.draftId,
    p_profile_id: input.profileId,
    p_passcode: input.passcode.trim(),
  });

  if (error) {
    throw error;
  }

  return data === true;
}

export async function claimGuestProfile(input: {
  username: string;
  passcode: string;
}) {
  const { data, error } = await supabase.rpc("claim_guest_profile", {
    p_player_name: input.username.trim(),
    p_passcode: input.passcode.trim(),
  });

  if (error) {
    throw error;
  }

  if (
    !data ||
    typeof data !== "object" ||
    (data as { claimed?: unknown }).claimed !== true
  ) {
    throw new Error("Guest username or passcode is incorrect.");
  }

  return data;
}

export async function setMyPlayerPasscode(passcode: string) {
  const { error } = await supabase.rpc("set_my_player_passcode", {
    p_passcode: passcode.trim(),
  });

  if (error) {
    throw error;
  }
}

export async function setMyPlayerName(username: string) {
  const normalizedUsername = username.trim();
  const { data, error } = await supabase.rpc("set_my_player_name", {
    p_player_name: normalizedUsername,
  });

  if (error) {
    throw error;
  }

  return String(
    (data as { playerName?: unknown } | null)?.playerName ?? normalizedUsername,
  ).trim();
}

export async function removeMyPlayerPasscode() {
  const { error } = await supabase.rpc("remove_my_player_passcode");

  if (error) {
    throw error;
  }
}
