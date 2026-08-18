import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import ActionButton from "@/components/ui/ActionButton";
import AppHeader from "@/components/ui/AppHeader";
import ProfileAppearancePicker from "@/components/player/ProfileAppearancePicker";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import SegmentedControl from "@/components/ui/SegmentedControl";
import Text from "@/components/ui/Text";
import {
  buildSavedAuthProfile,
  getImmediateProfileUserId,
} from "@/lib/auth/registerFlow";
import { clearPendingAuthIntent } from "@/lib/auth/pendingAuthIntent";
import { loadHydratedCloudState } from "@/lib/cloud/loadHydratedCloudState";
import {
  claimGuestProfile,
  isValidPlayerPasscode,
  isValidPlayerUsername,
  lookupClaimableGuest,
  type ClaimableGuestPreview,
} from "@/lib/cloud/playerAccess";
import { useNameAvailability } from "@/lib/cloud/useNameAvailability";
import { isDeletedAtColumnMissingError } from "@/lib/cloud/profileSoftDeleteCompat";
import {
  buildSupabaseRedirectUrl,
  formatSupabaseConfigError,
  supabase,
} from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { useTheme } from "@/theme";
import { APP_ROUTES, buildHomeRoute } from "@/utils/appRoutes";
import { type CardColor } from "@/utils/cardAssignment";
import {
  buildProfileAppearanceSavePayload,
  normalizePreferredProfileColor,
  resolveAssignedCardArtIndexForProfile,
} from "@/utils/profileAppearance";

function normalizePlayerName(value: string) {
  return value.trim();
}

type ProfileMode = "new-player" | "claim-guest";

const PROFILE_MODE_ITEMS = [
  { key: "new-player" as ProfileMode, label: "New player" },
  { key: "claim-guest" as ProfileMode, label: "Claim guest" },
];

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const authProfile = useStore((state) => state.authProfile);
  const authSession = useStore((state) => state.authSession);
  const setPasswordRecoveryPending = useStore(
    (state) => state.setPasswordRecoveryPending,
  );
  const setAuthProfile = useStore((state) => state.setAuthProfile);
  const setAuthSession = useStore((state) => state.setAuthSession);
  const hydrateCloudSnapshot = useStore((state) => state.hydrateCloudSnapshot);
  const upsertRegisteredProfile = useStore((state) => state.upsertRegisteredProfile);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [playerName, setPlayerName] = useState(authProfile?.player_name ?? "");
  const [guestPasscode, setGuestPasscode] = useState("");
  const [profileMode, setProfileMode] = useState<ProfileMode>("new-player");
  const [favoriteColor, setFavoriteColor] = useState<CardColor | null>(
    normalizePreferredProfileColor(authProfile?.favorite_color),
  );
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [guestPreview, setGuestPreview] = useState<ClaimableGuestPreview | null>(
    null,
  );
  const [guestLookup, setGuestLookup] = useState<
    "idle" | "checking" | "found" | "missing"
  >("idle");

  const needsProfileOnly =
    Boolean(authSession?.user?.id) && !authProfile?.player_name;

  const nameAvailability = useNameAvailability(
    profileMode === "new-player" && !needsProfileOnly ? playerName : "",
  );

  // Claiming is one-way and cannot be replayed, so the guest is looked up and
  // shown back before the form will commit to it.
  useEffect(() => {
    if (profileMode !== "claim-guest" || !isValidPlayerUsername(playerName)) {
      setGuestPreview(null);
      setGuestLookup("idle");
      return undefined;
    }

    let active = true;
    setGuestLookup("checking");

    const timer = setTimeout(() => {
      lookupClaimableGuest(playerName)
        .then((preview) => {
          if (!active) {
            return;
          }
          setGuestPreview(preview);
          setGuestLookup(preview ? "found" : "missing");
        })
        .catch(() => {
          if (active) {
            setGuestPreview(null);
            setGuestLookup("idle");
          }
        });
    }, 350);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [playerName, profileMode]);

  const canSubmit = useMemo(() => {
    const normalizedPlayerName = normalizePlayerName(playerName);

    if (!isValidPlayerUsername(normalizedPlayerName)) {
      return false;
    }

    if (profileMode === "claim-guest") {
      if (!isValidPlayerPasscode(guestPasscode)) {
        return false;
      }

      // Nothing is committed to a guest the lookup could not find.
      if (guestLookup !== "found") {
        return false;
      }
    }

    if (profileMode === "new-player" && nameAvailability === "taken") {
      return false;
    }

    if (profileMode === "new-player" && !favoriteColor) {
      return false;
    }

    return needsProfileOnly || (email.trim().length > 0 && password.trim().length >= 6);
  }, [
    email,
    favoriteColor,
    guestLookup,
    guestPasscode,
    nameAvailability,
    needsProfileOnly,
    password,
    playerName,
    profileMode,
  ]);

  const assignedCardArtIndex = useMemo(
    () =>
      resolveAssignedCardArtIndexForProfile({
        favoriteColor,
        assignedCardArtIndex: null,
      }),
    [favoriteColor],
  );

  async function saveProfile(
    userId: string,
    nextFavoriteColor: CardColor,
    nextAssignedCardArtIndex: number | null,
  ) {
    const payload = buildProfileAppearanceSavePayload({
      playerName,
      displayName: null,
      favoriteColor: nextFavoriteColor,
      assignedCardArtIndex: nextAssignedCardArtIndex,
    });

    let { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
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
          id: userId,
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
  }

  async function handleRegister() {
    if (!canSubmit || submitting) {
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      if (profileMode === "new-player" && !favoriteColor) {
        setMessage("Choose a preferred color first.");
        return;
      }

      if (needsProfileOnly && authSession?.user?.id) {
        if (profileMode === "claim-guest") {
          await claimGuestProfile({
            username: playerName,
            passcode: guestPasscode,
          });
          const hydratedSnapshot = await loadHydratedCloudState(authSession);
          hydrateCloudSnapshot(hydratedSnapshot);
          setPasswordRecoveryPending(false);
          await clearPendingAuthIntent();
          router.replace(buildHomeRoute());
          return;
        }

        if (!favoriteColor) return;
        await saveProfile(authSession.user.id, favoriteColor, assignedCardArtIndex);
        const savedProfile = buildSavedAuthProfile(
          authSession.user.id,
          playerName,
          "",
          favoriteColor,
          assignedCardArtIndex,
        );
        const savedRegisteredProfile = {
          id: authSession.user.id,
          name: normalizePlayerName(playerName),
          color: favoriteColor,
          assignedCardArtIndex,
          hasSavedGames: false,
        };

        try {
          const hydratedSnapshot = await loadHydratedCloudState(authSession);
          hydrateCloudSnapshot(hydratedSnapshot);
        } catch {
          setAuthProfile(savedProfile);
          upsertRegisteredProfile(savedRegisteredProfile);
        }

        setPasswordRecoveryPending(false);
        await clearPendingAuthIntent();
        router.replace({
          pathname: APP_ROUTES.roster,
          params: {
            tab: "players",
            profileSetup: "1",
          },
        });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: buildSupabaseRedirectUrl("moonrakers", {
            type: "email",
          }),
          data: {
            ...(profileMode === "new-player"
              ? {
                  player_name: normalizePlayerName(playerName),
                  favorite_color: favoriteColor,
                  assigned_card_art_index: assignedCardArtIndex ?? undefined,
                }
              : {}),
          },
        },
      });

      if (error) {
        throw error;
      }

      const userId = getImmediateProfileUserId(data);

      if (userId) {
        const nextSession = {
          user: {
            id: userId,
            email: data.session?.user?.email ?? email.trim(),
          },
        };
        setAuthSession(nextSession);

        if (profileMode === "claim-guest") {
          await claimGuestProfile({
            username: playerName,
            passcode: guestPasscode,
          });
          const hydratedSnapshot = await loadHydratedCloudState(nextSession);
          hydrateCloudSnapshot(hydratedSnapshot);
          setPasswordRecoveryPending(false);
          await clearPendingAuthIntent();
          router.replace(buildHomeRoute());
          return;
        }

        if (!favoriteColor) return;
        await saveProfile(userId, favoriteColor, assignedCardArtIndex);
        setAuthProfile(
          buildSavedAuthProfile(
            userId,
            playerName,
            "",
            favoriteColor,
            assignedCardArtIndex,
          ),
        );
        upsertRegisteredProfile({
          id: userId,
          name: normalizePlayerName(playerName),
          color: favoriteColor,
          assignedCardArtIndex,
          hasSavedGames: false,
        });
        setPasswordRecoveryPending(false);
        await clearPendingAuthIntent();
        router.replace(buildHomeRoute());
        return;
      }

      setMessage(
        profileMode === "claim-guest"
          ? "Account created. Check your email, then log in and claim the guest with its username and passcode."
          : "Account created. Check your email, then log in to finish profile setup.",
      );
    } catch (error) {
      setMessage(formatSupabaseConfigError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      preset="authHero"
      density="compact"
      viewport={needsProfileOnly ? "scroll" : "fit"}
      edges={["top", "left", "right", "bottom"]}
      contentContainerStyle={
        needsProfileOnly ? styles.pageContentScroll : styles.pageContentFit
      }
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={needsProfileOnly ? styles.keyboardScroll : styles.keyboardFit}
      >
        <View style={styles.stack}>
          <AppHeader
            eyebrow="Moonraker's Analytics"
            title={needsProfileOnly ? "Finish Profile" : "Create Account"}
            identity="emblem"
            size="compact"
            variant="compact"
          />

          <SectionCard
            eyebrow={needsProfileOnly ? "Commander Profile" : "Account Setup"}
            title={
              profileMode === "claim-guest"
                ? "Claim guest profile"
                : needsProfileOnly
                  ? "Finish profile"
                  : "Create account"
            }
          >
            <SegmentedControl
              items={PROFILE_MODE_ITEMS}
              value={profileMode}
              onChange={(nextMode) => {
                setProfileMode(nextMode);
                setMessage(null);
              }}
            />
            {!needsProfileOnly ? (
              <>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  placeholder="Email"
                  placeholderTextColor={theme.colors.text.muted}
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface.alloy,
                      borderColor: theme.colors.border.subtle,
                      color: theme.colors.text.primary,
                    },
                  ]}
                  value={email}
                  onChangeText={setEmail}
                />

                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Password (6+ characters)"
                  placeholderTextColor={theme.colors.text.muted}
                  secureTextEntry
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface.alloy,
                      borderColor: theme.colors.border.subtle,
                      color: theme.colors.text.primary,
                    },
                  ]}
                  value={password}
                  onChangeText={setPassword}
                />
              </>
            ) : null}

            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={
                profileMode === "claim-guest" ? "Guest username" : "Username"
              }
              placeholderTextColor={theme.colors.text.muted}
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface.alloy,
                  borderColor: theme.colors.border.subtle,
                  color: theme.colors.text.primary,
                },
              ]}
              value={playerName}
              onChangeText={setPlayerName}
            />

            {profileMode === "claim-guest" ? (
              guestLookup === "checking" ? (
                <Text style={[styles.note, { color: theme.colors.text.muted }]}>
                  Looking for that guest…
                </Text>
              ) : guestLookup === "missing" ? (
                <Text style={[styles.note, styles.noteWarn]}>
                  No unclaimed guest called {playerName.trim()}. Check the spelling
                  with the host who created it.
                </Text>
              ) : guestPreview ? (
                <View style={styles.previewCard}>
                  <Text style={styles.previewTitle}>{guestPreview.username}</Text>
                  <Text style={[styles.note, { color: theme.colors.text.secondary }]}>
                    {guestPreview.gamesPlayed === 0
                      ? "No games played yet."
                      : `${guestPreview.gamesPlayed} game${
                          guestPreview.gamesPlayed === 1 ? "" : "s"
                        } will move to this account. This cannot be undone.`}
                  </Text>
                </View>
              ) : null
            ) : nameAvailability === "taken" ? (
              <Text style={[styles.note, styles.noteWarn]}>
                {playerName.trim()} is already taken.
              </Text>
            ) : nameAvailability === "free" ? (
              <Text style={[styles.note, styles.noteOk]}>
                {playerName.trim()} is free.
              </Text>
            ) : null}

            {profileMode === "claim-guest" ? (
              <>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="Guest passcode"
                  placeholderTextColor={theme.colors.text.muted}
                  secureTextEntry
                  style={[
                    styles.input,
                    {
                      backgroundColor: theme.colors.surface.alloy,
                      borderColor: theme.colors.border.subtle,
                      color: theme.colors.text.primary,
                    },
                  ]}
                  value={guestPasscode}
                  onChangeText={setGuestPasscode}
                />
                <Text style={styles.message}>
                  The guest's games, stats, color, and card art move with the profile.
                  Your signed-in email becomes its account login.
                </Text>
              </>
            ) : (
              <ProfileAppearancePicker
                title="Color"
                subtitle="Card matches color."
                favoriteColor={favoriteColor}
                assignedCardArtIndex={assignedCardArtIndex}
                onSelectFavoriteColor={setFavoriteColor}
                allowCardSelection={false}
                autoAssignHint="Card matches color."
              />
            )}

            {message ? (
              <Text
                style={[
                  styles.message,
                  {
                    color: theme.colors.text.secondary,
                  },
                ]}
              >
                {message}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <ActionButton
                disabled={!canSubmit || submitting}
                onPress={handleRegister}
                title={
                  submitting
                    ? profileMode === "claim-guest"
                      ? "Claiming Guest..."
                      : needsProfileOnly
                        ? "Saving Profile..."
                      : "Creating Account..."
                    : profileMode === "claim-guest"
                      ? "Claim Guest"
                      : needsProfileOnly
                        ? "Save Profile"
                      : "Create Account"
                }
                icon={
                  submitting ? (
                    <ActivityIndicator color={theme.colors.text.primary} size="small" />
                  ) : undefined
                }
              />

              {!needsProfileOnly ? (
                <ActionButton
                  variant="ghost"
                  onPress={() => router.push(APP_ROUTES.login)}
                  title="Back to Login"
                />
              ) : null}
            </View>
          </SectionCard>
        </View>
      </KeyboardAvoidingView>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  note: {
    fontSize: 12,
    lineHeight: 17,
  },
  noteWarn: {
    color: "#FCA5A5",
  },
  noteOk: {
    color: "#6EE7B7",
  },
  previewCard: {
    gap: 4,
    borderRadius: 14,
    padding: 12,
    backgroundColor: "rgba(103,232,249,0.10)",
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.34)",
  },
  previewTitle: {
    color: "#F8FBFF",
    fontSize: 17,
    fontWeight: "800",
  },
  pageContentFit: {
    flex: 1,
    justifyContent: "center",
  },
  pageContentScroll: {
    justifyContent: "flex-start",
  },
  keyboardFit: {
    flex: 1,
    justifyContent: "center",
  },
  keyboardScroll: {
    flex: 1,
  },
  stack: {
    gap: 12,
  },
  input: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  actions: {
    gap: 10,
    marginTop: 2,
  },
});
