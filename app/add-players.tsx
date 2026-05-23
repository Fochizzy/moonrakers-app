import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";

import ProfileAppearancePicker from "@/components/player/ProfileAppearancePicker";
import PlayerCardIcon from "@/components/player/PlayerCardIcon";
import Text from "@/components/ui/Text";
import StarryNight from "@/components/ui/StarryNight";
import { buildSavedAuthProfile } from "@/lib/auth/registerFlow";
import { loadCloudSnapshot } from "@/lib/cloud/loadCloudSnapshot";
import { loadRegisteredProfiles } from "@/lib/cloud/loadRegisteredProfiles";
import { loadStatsSnapshot } from "@/lib/cloud/loadStatsSnapshot";
import { deleteOwnProfile } from "@/lib/cloud/deleteOwnProfile";
import { isDeletedAtColumnMissingError } from "@/lib/cloud/profileSoftDeleteCompat";
import { createSharedGroup, deleteSharedGroup } from "@/lib/cloud/sharedGroups";
import { formatSupabaseConfigError, supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { APP_ROUTES } from "@/utils/appRoutes";
import { type CardColor } from "@/utils/cardAssignment";
import {
  isLikelyRegisteredProfileId,
  mergeRegisteredProfilesIntoPlayers,
} from "@/utils/registeredProfilePlayer";
import {
  buildProfileAppearanceSavePayload,
  normalizePreferredProfileColor,
  resolveAssignedCardArtIndexForProfile,
} from "@/utils/profileAppearance";
import { getPlayerAccentColor } from "@/utils/turnTheme";

type TabKey = "players" | "groups";

type PlayerLike = {
  id: string;
  name: string;
  color?: string;
  displayName?: string;
  hasSavedGames?: boolean;
  assignedCardArtIndex?: number | null;
};

type GroupLike = {
  id: string;
  name: string;
  playerIds: string[];
  createdAt?: number;
};

type AddPlayersRouteParams = {
  profileSetup?: string | string[];
  tab?: string | string[];
};

const HISTORY_REPLACEMENT_NAME = "Mx. Doe";

function getRouteParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeTabParam(value?: string | string[]): TabKey {
  return String(getRouteParam(value) ?? "").trim().toLowerCase() === "groups"
    ? "groups"
    : "players";
}

function isTruthyRouteParam(value?: string | string[]) {
  const normalized = String(getRouteParam(value) ?? "")
    .trim()
    .toLowerCase();

  return normalized === "1" || normalized === "true" || normalized === "yes";
}

export default function AddPlayersScreen() {
  const router = useRouter();
  const routeParams = useLocalSearchParams<AddPlayersRouteParams>();

  const players = useStore((state: any) => state.players ?? []) as PlayerLike[];
  const groups = useStore((state: any) => state.groups ?? []) as GroupLike[];
  const authSession = useStore((state: any) => state.authSession);
  const authProfile = useStore((state: any) => state.authProfile);
  const setAuthProfile = useStore((state: any) => state.setAuthProfile);
  const hydrateCloudSnapshot = useStore((state: any) => state.hydrateCloudSnapshot);
  const upsertRegisteredProfile = useStore(
    (state: any) => state.upsertRegisteredProfile,
  );
  const resetStore = useStore((state: any) => state.resetStore);

  const requestedTab = useMemo(
    () => normalizeTabParam(routeParams.tab),
    [routeParams.tab],
  );
  const profileSetupHandoff = useMemo(
    () => isTruthyRouteParam(routeParams.profileSetup),
    [routeParams.profileSetup],
  );

  const [tab, setTab] = useState<TabKey>(requestedTab);
  const [showProfileSetupCallout, setShowProfileSetupCallout] = useState(
    profileSetupHandoff,
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [savingGroup, setSavingGroup] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [selectedGroupPlayerIds, setSelectedGroupPlayerIds] = useState<string[]>([]);

  const currentFavoriteColor = useMemo(
    () => normalizePreferredProfileColor(authProfile?.favorite_color),
    [authProfile?.favorite_color],
  );

  const currentAssignedCardArtIndex = useMemo(
    () =>
      resolveAssignedCardArtIndexForProfile({
        favoriteColor: currentFavoriteColor,
        assignedCardArtIndex: authProfile?.assigned_card_art_index ?? null,
      }),
    [authProfile?.assigned_card_art_index, currentFavoriteColor],
  );

  const [favoriteColor, setFavoriteColor] = useState<CardColor | null>(currentFavoriteColor);
  const [assignedCardArtIndex, setAssignedCardArtIndex] = useState<number | null>(
    currentAssignedCardArtIndex,
  );

  useEffect(() => {
    setFavoriteColor(currentFavoriteColor);
    setAssignedCardArtIndex(currentAssignedCardArtIndex);
  }, [currentAssignedCardArtIndex, currentFavoriteColor]);

  useEffect(() => {
    setShowProfileSetupCallout(profileSetupHandoff);
    if (profileSetupHandoff) {
      setTab("players");
      return;
    }

    setTab(requestedTab);
  }, [profileSetupHandoff, requestedTab]);

  const sortedPlayers = useMemo(
    () => [...players].sort((left, right) => left.name.localeCompare(right.name)),
    [players],
  );

  const sortedGroups = useMemo(
    () => [...groups].sort((left, right) => left.name.localeCompare(right.name)),
    [groups],
  );

  useEffect(() => {
    const validPlayerIds = new Set(sortedPlayers.map((player) => player.id));
    setSelectedGroupPlayerIds((current) =>
      current.filter((playerId) => validPlayerIds.has(playerId)).slice(0, 5),
    );
  }, [sortedPlayers]);

  const signedInUserId = String(authSession?.user?.id ?? "").trim();
  const profileReady = Boolean(signedInUserId && authProfile?.player_name);
  const profileName =
    String(authProfile?.player_name ?? "").trim() ||
    String(authProfile?.display_name ?? "").trim() ||
    "Signed-in player";
  const profileAccent = getPlayerAccentColor(favoriteColor ?? currentFavoriteColor ?? "blue");
  const existingProfilePlayer = players.find((player) => player.id === signedInUserId) ?? null;
  const unregisteredSelectedPlayers = useMemo(
    () =>
      sortedPlayers.filter(
        (player) =>
          selectedGroupPlayerIds.includes(player.id) &&
          !isLikelyRegisteredProfileId(player.id),
      ),
    [selectedGroupPlayerIds, sortedPlayers],
  );

  const hasProfileChanges =
    favoriteColor !== currentFavoriteColor ||
    assignedCardArtIndex !== currentAssignedCardArtIndex;
  const canSaveProfile =
    profileReady &&
    Boolean(favoriteColor) &&
    assignedCardArtIndex != null &&
    hasProfileChanges &&
    !savingProfile &&
    !deletingProfile;

  function handleFavoriteColorChange(nextColor: CardColor) {
    setFavoriteColor(nextColor);
    setAssignedCardArtIndex((current) =>
      resolveAssignedCardArtIndexForProfile({
        favoriteColor: nextColor,
        assignedCardArtIndex: current,
      }),
    );
  }

  async function refreshCloudGroupState() {
    if (!signedInUserId || !authSession?.user?.id) {
      return;
    }

    const [snapshot, registeredProfiles] = await Promise.all([
      loadCloudSnapshot(signedInUserId),
      loadRegisteredProfiles().catch(() => []),
    ]);
    const statsSnapshot = await loadStatsSnapshot({
      profileId: signedInUserId,
      groups: snapshot.groups,
      games: snapshot.games,
    });

    hydrateCloudSnapshot({
      session: authSession,
      snapshot: {
        ...snapshot,
        players: mergeRegisteredProfilesIntoPlayers(
          snapshot.players,
          registeredProfiles,
        ),
      },
      statsSnapshot,
    });
  }

  function ensureSharedGroupAccess() {
    if (!signedInUserId) {
      Alert.alert("Login required", "Log in before managing shared groups.");
      router.push(APP_ROUTES.login as any);
      return false;
    }

    if (!profileReady) {
      Alert.alert("Finish profile", "Finish profile setup before managing shared groups.");
      router.push(APP_ROUTES.register as any);
      return false;
    }

    return true;
  }

  async function handleSaveProfile() {
    if (!canSaveProfile || !favoriteColor || assignedCardArtIndex == null || !signedInUserId) {
      return;
    }

    setSavingProfile(true);

    try {
      const payload = buildProfileAppearanceSavePayload({
        playerName: profileName,
        displayName: String(authProfile?.display_name ?? ""),
        favoriteColor,
        assignedCardArtIndex,
      });

      let { error } = await supabase.from("profiles").upsert(
        {
          id: signedInUserId,
          deleted_at: null,
          ...payload,
        },
        {
          onConflict: "id",
        },
      );

      if (isDeletedAtColumnMissingError(error)) {
        ({ error } = await supabase.from("profiles").upsert(
          {
            id: signedInUserId,
            ...payload,
          },
          {
            onConflict: "id",
          },
        ));
      }

      if (error) {
        throw error;
      }

      setAuthProfile(
        buildSavedAuthProfile(
          signedInUserId,
          payload.player_name,
          payload.display_name ?? "",
          payload.favorite_color,
          payload.assigned_card_art_index,
        ),
      );

      upsertRegisteredProfile?.({
        id: signedInUserId,
        name: payload.player_name,
        displayName: payload.display_name ?? undefined,
        color: payload.favorite_color ?? undefined,
        assignedCardArtIndex: payload.assigned_card_art_index ?? null,
        hasSavedGames: Boolean(existingProfilePlayer?.hasSavedGames),
      });

      setShowProfileSetupCallout(false);
      Alert.alert("Profile updated", "Your color and player card were saved.");
    } catch (error) {
      Alert.alert("Couldn't save profile", formatSupabaseConfigError(error));
    } finally {
      setSavingProfile(false);
    }
  }

  async function confirmDeleteProfile() {
    if (!signedInUserId || deletingProfile) {
      return;
    }

    setDeletingProfile(true);

    try {
      await deleteOwnProfile();
      resetStore?.();
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        throw signOutError;
      }
      router.replace(APP_ROUTES.login as any);
    } catch (error) {
      Alert.alert("Couldn't delete profile", formatSupabaseConfigError(error));
    } finally {
      setDeletingProfile(false);
    }
  }

  function handleDeleteProfile() {
    if (!signedInUserId || deletingProfile) {
      return;
    }

    Alert.alert(
      "Delete your profile",
      `${profileName} will be removed from the active roster, replaced with ${HISTORY_REPLACEMENT_NAME} in saved game history, and signed out on this device.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete profile",
          style: "destructive",
          onPress: () => {
            void confirmDeleteProfile();
          },
        },
      ],
    );
  }

  function toggleGroupPlayer(playerId: string) {
    setSelectedGroupPlayerIds((current) =>
      current.includes(playerId)
        ? current.filter((id) => id !== playerId)
        : current.length >= 5
          ? current
          : [...current, playerId],
    );
  }

  async function handleCreateGroup() {
    const trimmed = groupName.trim();
    if (!trimmed) {
      Alert.alert("Group name required", "Enter a group name first.");
      return;
    }

    if (selectedGroupPlayerIds.length < 2) {
      Alert.alert("More players needed", "Select at least 2 players for a group.");
      return;
    }

    if (unregisteredSelectedPlayers.length > 0) {
      Alert.alert(
        "Registered players only",
        `${unregisteredSelectedPlayers
          .map((player) => player.name)
          .join(", ")} need an account before they can be added to a shared group.`,
      );
      return;
    }

    if (!ensureSharedGroupAccess()) {
      return;
    }

    setSavingGroup(true);

    try {
      await createSharedGroup({
        createdBy: signedInUserId,
        name: trimmed,
        playerIds: selectedGroupPlayerIds,
      });
      setGroupName("");
      setSelectedGroupPlayerIds([]);

      try {
        await refreshCloudGroupState();
      } catch {
        Alert.alert("Group saved", "Saved, but couldn't refresh yet.");
      }
    } catch (error) {
      Alert.alert("Couldn't save group", formatSupabaseConfigError(error));
    } finally {
      setSavingGroup(false);
    }
  }

  async function handleDeleteGroup(group: GroupLike) {
    if (!group?.id) {
      return;
    }

    if (!ensureSharedGroupAccess()) {
      return;
    }

    if (
      !isLikelyRegisteredProfileId(group.id) ||
      !group.playerIds.includes(signedInUserId)
    ) {
      Alert.alert("Can't delete group", "Only players in this group can delete it.");
      return;
    }

    setDeletingGroupId(group.id);

    try {
      await deleteSharedGroup(group.id);

      try {
        await refreshCloudGroupState();
      } catch {
        Alert.alert("Group deleted", "Deleted, but couldn't refresh yet.");
      }
    } catch (error) {
      Alert.alert("Couldn't delete group", formatSupabaseConfigError(error));
    } finally {
      setDeletingGroupId((current) => (current === group.id ? null : current));
    }
  }

  return (
    <SafeAreaView
      style={styles.screen}
      edges={["top", "right", "bottom", "left"]}
    >
      <View style={StyleSheet.absoluteFillObject}>
        <StarryNight />
        <View style={styles.overlay} />
      </View>

      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>{"<"}</Text>
          </Pressable>

          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Players & Groups</Text>
            <Text style={styles.subtitle}>
              Customize your player card and save groups for game setup.
            </Text>
          </View>
        </View>

        <View style={styles.tabRow}>
          <Pressable
            onPress={() => setTab("players")}
            style={[styles.tabBtn, tab === "players" && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, tab === "players" && styles.tabTextActive]}>
              Players
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setTab("groups")}
            style={[styles.tabBtn, tab === "groups" && styles.tabBtnActive]}
          >
            <Text style={[styles.tabText, tab === "groups" && styles.tabTextActive]}>
              Saved Groups
            </Text>
          </Pressable>
        </View>

        {tab === "players" ? (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Your player card</Text>
              <Text style={styles.helperText}>
                Only the signed-in captain can change this profile.
              </Text>

              {profileReady ? (
                <>
                  {showProfileSetupCallout ? (
                    <View style={styles.profileSetupCallout}>
                      <Text style={styles.profileSetupCalloutEyebrow}>Next Step</Text>
                      <Text style={styles.profileSetupCalloutTitle}>
                        Choose your matching player card
                      </Text>
                      <Text style={styles.profileSetupCalloutText}>
                        Pick one of the matching card styles for your selected color, then
                        save changes.
                      </Text>
                    </View>
                  ) : null}

                  <View
                    style={[
                      styles.previewHeroCard,
                      {
                        borderColor: `${profileAccent}44`,
                        backgroundColor: `${profileAccent}14`,
                      },
                    ]}
                  >
                    <PlayerCardIcon
                      player={{
                        id: signedInUserId,
                        name: profileName,
                        color: favoriteColor ?? currentFavoriteColor ?? "blue",
                        assignedCardArtIndex,
                      }}
                      size={124}
                      borderRadius={18}
                      showInitial={false}
                    />

                    <View style={styles.previewHeroCopy}>
                      <Text style={styles.previewHeroEyebrow}>Signed In</Text>
                      <Text style={styles.previewHeroTitle}>{profileName}</Text>
                      <Text style={styles.previewHeroSubtitle}>
                        Choose the color and card art tied to your account everywhere it
                        appears.
                      </Text>
                    </View>
                  </View>

                  <ProfileAppearancePicker
                    title={showProfileSetupCallout ? "Choose your player card" : "Appearance"}
                    subtitle={
                      showProfileSetupCallout
                        ? "Pick one of the matching card styles for your selected color, then save changes."
                        : "Pick the color and player card image that represent your account."
                    }
                    favoriteColor={favoriteColor}
                    assignedCardArtIndex={assignedCardArtIndex}
                    onSelectFavoriteColor={handleFavoriteColorChange}
                    onSelectAssignedCardArtIndex={setAssignedCardArtIndex}
                    allowCardSelection
                  />

                  <Pressable
                    onPress={() => {
                      void handleSaveProfile();
                    }}
                    disabled={!canSaveProfile}
                    style={[
                      styles.primaryBtn,
                      !canSaveProfile && styles.buttonDisabled,
                    ]}
                  >
                    {savingProfile ? (
                      <ActivityIndicator color="#020814" />
                    ) : (
                      <Text style={styles.primaryBtnText}>Save changes</Text>
                    )}
                  </Pressable>

                  <Text style={styles.deleteHint}>
                    Deleting your profile removes the sign-in account and replaces you with{" "}
                    {HISTORY_REPLACEMENT_NAME} in saved game history.
                  </Text>

                  <Pressable
                    onPress={handleDeleteProfile}
                    disabled={deletingProfile || savingProfile}
                    style={[
                      styles.deleteBtn,
                      (deletingProfile || savingProfile) && styles.buttonDisabled,
                    ]}
                  >
                    {deletingProfile ? (
                      <ActivityIndicator color="#FDE2E2" />
                    ) : (
                      <Text style={styles.deleteBtnText}>Delete your profile</Text>
                    )}
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={styles.emptyText}>
                    Finish account setup before editing the signed-in player card here.
                  </Text>

                  <Pressable
                    onPress={() => router.push(APP_ROUTES.register as any)}
                    style={styles.secondaryBtn}
                  >
                    <Text style={styles.secondaryBtnText}>Finish profile setup</Text>
                  </Pressable>
                </>
              )}
            </View>
          </ScrollView>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Create saved group</Text>

              <TextInput
                value={groupName}
                onChangeText={setGroupName}
                placeholder="Group name"
                placeholderTextColor="#6E87AE"
                style={styles.input}
              />

              <View style={styles.groupSelectionSummary}>
                <Text style={styles.groupSelectionSummaryTitle}>
                  {selectedGroupPlayerIds.length === 0
                    ? "No players selected yet"
                    : `${selectedGroupPlayerIds.length} players ready`}
                </Text>
                <Text style={styles.groupSelectionSummaryText}>
                  {selectedGroupPlayerIds.length === 0
                    ? "Pick a table first, then save the group when the five seats feel right."
                    : sortedPlayers
                        .filter((player) => selectedGroupPlayerIds.includes(player.id))
                        .map((player) => player.name)
                        .join(" / ")}
                </Text>
              </View>

              <Text style={styles.smallLabel}>
                Select players ({selectedGroupPlayerIds.length}/5)
              </Text>

              <View style={styles.groupPlayerGrid}>
                {sortedPlayers.map((player) => {
                  const active = selectedGroupPlayerIds.includes(player.id);
                  const accent = getPlayerAccentColor(player.color ?? "blue");

                  return (
                    <Pressable
                      key={player.id}
                      onPress={() => toggleGroupPlayer(player.id)}
                      style={[
                        styles.groupPlayerTile,
                        active && {
                          borderColor: accent,
                          backgroundColor: `${accent}18`,
                        },
                      ]}
                    >
                      <PlayerCardIcon
                        player={player as any}
                        size={72}
                        borderRadius={14}
                        showInitial={false}
                      />
                      <Text style={styles.groupPlayerName} numberOfLines={1}>
                        {player.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Pressable
                onPress={() => {
                  void handleCreateGroup();
                }}
                disabled={savingGroup}
                style={[styles.primaryBtn, savingGroup && styles.buttonDisabled]}
              >
                {savingGroup ? (
                  <ActivityIndicator color="#020814" />
                ) : (
                  <Text style={styles.primaryBtnText}>Save Group</Text>
                )}
              </Pressable>
            </View>

            <View style={styles.panel}>
              <Text style={styles.sectionTitle}>Saved groups</Text>

              {sortedGroups.length === 0 ? (
                <Text style={styles.emptyText}>No saved groups yet.</Text>
              ) : (
                <View style={styles.groupList}>
                  {sortedGroups.map((group) => (
                    <View key={group.id} style={styles.groupCard}>
                      <View style={styles.groupCardTop}>
                        <View style={styles.flexGrow}>
                          <Text style={styles.groupName}>{group.name}</Text>
                          <Text style={styles.groupMeta}>{group.playerIds.length} players</Text>
                        </View>

                        {profileReady &&
                        signedInUserId &&
                        isLikelyRegisteredProfileId(group.id) &&
                        group.playerIds.includes(signedInUserId) ? (
                          <Pressable
                            onPress={() => {
                              Alert.alert(
                                "Delete shared group",
                                `Delete ${group.name} for every member?`,
                                [
                                  { text: "Cancel", style: "cancel" },
                                  {
                                    text: "Delete",
                                    style: "destructive",
                                    onPress: () => {
                                      void handleDeleteGroup(group);
                                    },
                                  },
                                ],
                              );
                            }}
                            disabled={deletingGroupId === group.id}
                            style={styles.deleteSmallBtn}
                          >
                            {deletingGroupId === group.id ? (
                              <ActivityIndicator color="#FDE2E2" />
                            ) : (
                              <Text style={styles.deleteSmallBtnText}>Delete</Text>
                            )}
                          </Pressable>
                        ) : null}
                      </View>

                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.groupCardPlayers}
                      >
                        {group.playerIds.map((id) => {
                          const player = players.find((candidate) => candidate.id === id);
                          if (!player) {
                            return null;
                          }

                          return (
                            <View key={id} style={styles.groupCardPlayer}>
                              <PlayerCardIcon
                                player={player as any}
                                size={54}
                                borderRadius={12}
                                showInitial={false}
                              />
                              <Text style={styles.groupCardPlayerName} numberOfLines={1}>
                                {player.name}
                              </Text>
                            </View>
                          );
                        })}
                      </ScrollView>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#030712",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,6,17,0.58)",
  },
  container: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 6,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  backText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  headerTextWrap: {
    flex: 1,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 30,
    fontWeight: "900",
  },
  subtitle: {
    color: "#8FAED7",
    fontSize: 13,
    marginTop: 2,
  },
  tabRow: {
    flexDirection: "row",
    gap: 12,
  },
  tabBtn: {
    flex: 1,
    minHeight: 68,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(67,117,183,0.18)",
    backgroundColor: "rgba(4,13,30,0.82)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  tabBtnActive: {
    backgroundColor: "rgba(37,99,235,0.2)",
    borderColor: "rgba(96,165,250,0.52)",
  },
  tabText: {
    color: "#E5EEF9",
    fontSize: 16,
    fontWeight: "900",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 14,
  },
  panel: {
    borderRadius: 26,
    padding: 16,
    gap: 14,
    backgroundColor: "rgba(5,14,31,0.9)",
    borderWidth: 1,
    borderColor: "rgba(67,117,183,0.16)",
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
  },
  helperText: {
    color: "#7D9BC4",
    fontSize: 12,
    marginTop: -4,
  },
  profileSetupCallout: {
    borderRadius: 20,
    padding: 14,
    gap: 6,
    backgroundColor: "rgba(96,165,250,0.14)",
    borderWidth: 1,
    borderColor: "rgba(125,211,252,0.3)",
  },
  profileSetupCalloutEyebrow: {
    color: "#67E8F9",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  profileSetupCalloutTitle: {
    color: "#F8FBFF",
    fontSize: 18,
    fontWeight: "900",
  },
  profileSetupCalloutText: {
    color: "#D7E7FF",
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "700",
  },
  previewHeroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 24,
    borderWidth: 1,
    padding: 14,
  },
  previewHeroCopy: {
    flex: 1,
    gap: 6,
  },
  previewHeroEyebrow: {
    color: "#93C5FD",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.7,
    textTransform: "uppercase",
  },
  previewHeroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  previewHeroSubtitle: {
    color: "#C6D8F6",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  primaryBtn: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "#F4F7FB",
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: {
    color: "#020814",
    fontSize: 16,
    fontWeight: "900",
  },
  secondaryBtn: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "rgba(37,99,235,0.22)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.36)",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryBtnText: {
    color: "#EAF2FF",
    fontSize: 16,
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  deleteHint: {
    color: "#F6C4C4",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
  },
  deleteBtn: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: "rgba(87,12,21,0.76)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtnText: {
    color: "#FDE2E2",
    fontSize: 16,
    fontWeight: "900",
  },
  smallLabel: {
    color: "#E8F1FF",
    fontSize: 13,
    fontWeight: "800",
  },
  input: {
    backgroundColor: "#081426",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(67,117,183,0.18)",
    color: "#FFFFFF",
    fontSize: 17,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  groupSelectionSummary: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 6,
  },
  groupSelectionSummaryTitle: {
    color: "#F8FBFF",
    fontSize: 14,
    fontWeight: "900",
  },
  groupSelectionSummaryText: {
    color: "#C6D8F6",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
  groupPlayerGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  groupPlayerTile: {
    width: "22.8%",
    alignItems: "center",
    gap: 6,
    borderRadius: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: "rgba(255,255,255,0.025)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  groupPlayerName: {
    color: "#F3F7FF",
    fontSize: 10,
    fontWeight: "800",
    width: "100%",
    textAlign: "center",
  },
  groupList: {
    gap: 10,
  },
  groupCard: {
    borderRadius: 18,
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    gap: 10,
  },
  groupCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  flexGrow: {
    flex: 1,
  },
  groupName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  groupMeta: {
    color: "#84A3CC",
    fontSize: 12,
    marginTop: 2,
  },
  deleteSmallBtn: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.26)",
  },
  deleteSmallBtnText: {
    color: "#F6A3A3",
    fontSize: 12,
    fontWeight: "900",
  },
  groupCardPlayers: {
    gap: 10,
    paddingRight: 6,
  },
  groupCardPlayer: {
    width: 62,
    alignItems: "center",
    gap: 4,
  },
  groupCardPlayerName: {
    color: "#E8F1FF",
    fontSize: 9,
    fontWeight: "700",
    width: "100%",
    textAlign: "center",
  },
  emptyText: {
    color: "#8FAED7",
    fontSize: 14,
    lineHeight: 20,
  },
});
