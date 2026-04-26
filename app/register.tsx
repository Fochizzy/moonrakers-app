import React, { useMemo, useState } from "react";
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
import Text from "@/components/ui/Text";
import {
  buildSavedAuthProfile,
  getImmediateProfileUserId,
} from "@/lib/auth/registerFlow";
import { clearPendingAuthIntent } from "@/lib/auth/pendingAuthIntent";
import {
  buildSupabaseRedirectUrl,
  formatSupabaseConfigError,
  supabase,
} from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { useTheme } from "@/theme";
import { APP_ROUTES } from "@/utils/appRoutes";
import { type CardColor } from "@/utils/cardAssignment";
import {
  buildProfileAppearanceSavePayload,
  normalizePreferredProfileColor,
  resolveAssignedCardArtIndexForProfile,
} from "@/utils/profileAppearance";

function normalizePlayerName(value: string) {
  return value.trim();
}

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
  const upsertRegisteredProfile = useStore((state) => state.upsertRegisteredProfile);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [playerName, setPlayerName] = useState(authProfile?.player_name ?? "");
  const [displayName, setDisplayName] = useState(authProfile?.display_name ?? "");
  const [favoriteColor, setFavoriteColor] = useState<CardColor | null>(
    normalizePreferredProfileColor(authProfile?.favorite_color),
  );
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const needsProfileOnly =
    Boolean(authSession?.user?.id) && !authProfile?.player_name;

  const canSubmit = useMemo(() => {
    const normalizedPlayerName = normalizePlayerName(playerName);

    if (!normalizedPlayerName) {
      return false;
    }

    if (!favoriteColor) {
      return false;
    }

    if (needsProfileOnly) {
      return true;
    }

    return email.trim().length > 0 && password.trim().length >= 6;
  }, [email, favoriteColor, needsProfileOnly, password, playerName]);

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
    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        ...buildProfileAppearanceSavePayload({
          playerName,
          displayName,
          favoriteColor: nextFavoriteColor,
          assignedCardArtIndex: nextAssignedCardArtIndex,
        }),
      },
      {
        onConflict: "id",
      },
    );

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
      if (!favoriteColor) {
        setMessage("Choose a preferred color first.");
        return;
      }

      if (needsProfileOnly && authSession?.user?.id) {
        await saveProfile(authSession.user.id, favoriteColor, assignedCardArtIndex);
        setAuthProfile(
          buildSavedAuthProfile(
            authSession.user.id,
            playerName,
            displayName,
            favoriteColor,
            assignedCardArtIndex,
          ),
        );
        upsertRegisteredProfile({
          id: authSession.user.id,
          name: normalizePlayerName(playerName),
          displayName: displayName.trim() || undefined,
          color: favoriteColor,
          assignedCardArtIndex,
          hasSavedGames: false,
        });
        setPasswordRecoveryPending(false);
        await clearPendingAuthIntent();
        router.replace(APP_ROUTES.home as any);
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
            player_name: normalizePlayerName(playerName),
            display_name: displayName.trim() || undefined,
            favorite_color: favoriteColor,
            assigned_card_art_index: assignedCardArtIndex ?? undefined,
          },
        },
      });

      if (error) {
        throw error;
      }

      const userId = getImmediateProfileUserId(data);

      if (userId) {
        await saveProfile(userId, favoriteColor, assignedCardArtIndex);
        setAuthSession({
          user: {
            id: userId,
            email: data.session?.user?.email ?? email.trim(),
          },
        });
        setAuthProfile(
          buildSavedAuthProfile(
            userId,
            playerName,
            displayName,
            favoriteColor,
            assignedCardArtIndex,
          ),
        );
        upsertRegisteredProfile({
          id: userId,
          name: normalizePlayerName(playerName),
          displayName: displayName.trim() || undefined,
          color: favoriteColor,
          assignedCardArtIndex,
          hasSavedGames: false,
        });
        setPasswordRecoveryPending(false);
        await clearPendingAuthIntent();
        router.replace(APP_ROUTES.home as any);
        return;
      }

      setMessage("Account created. Check your email, then log in to finish profile setup.");
    } catch (error) {
      setMessage(formatSupabaseConfigError(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageShell
      preset="auth"
      scroll={false}
      edges={["top", "left", "right", "bottom"]}
      contentContainerStyle={styles.pageContent}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <View style={styles.stack}>
          <AppHeader
            eyebrow="Moonrakers Command"
            title={needsProfileOnly ? "Finish Profile" : "Create Account"}
            subtitle={
              needsProfileOnly
                ? "Save the rest of your account."
                : "Create your account."
            }
            identity="emblem"
          />

          <SectionCard
            eyebrow={needsProfileOnly ? "Commander Profile" : "Account Setup"}
            title={needsProfileOnly ? "Save your profile" : "Register a new crew record"}
            subtitle={
              needsProfileOnly
                ? "Finish your player details."
                : "Claim your public player name."
            }
          >
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
              placeholder="Public player name"
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

            <TextInput
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="Display name (optional)"
              placeholderTextColor={theme.colors.text.muted}
              style={[
                styles.input,
                {
                  backgroundColor: theme.colors.surface.alloy,
                  borderColor: theme.colors.border.subtle,
                  color: theme.colors.text.primary,
                },
              ]}
              value={displayName}
              onChangeText={setDisplayName}
            />

            <ProfileAppearancePicker
              title="Preferred Color"
              subtitle="Choose your command color. Moonrakers will assign the matching default card at signup."
              favoriteColor={favoriteColor}
              assignedCardArtIndex={assignedCardArtIndex}
              onSelectFavoriteColor={setFavoriteColor}
              allowCardSelection={false}
              autoAssignHint="You can change the exact card later from Manage My Roster."
            />

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
                    ? needsProfileOnly
                      ? "Saving Profile..."
                      : "Creating Account..."
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
                  onPress={() => router.push(APP_ROUTES.login as any)}
                  title="Back To Login"
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
  pageContent: {
    flex: 1,
    justifyContent: "center",
  },
  keyboard: {
    flex: 1,
    justifyContent: "center",
  },
  stack: {
    gap: 16,
  },
  input: {
    minHeight: 50,
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
    marginTop: 4,
  },
});
