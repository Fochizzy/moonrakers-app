import React, { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import ActionButton from "@/components/ui/ActionButton";
import Text from "@/components/ui/Text";
import {
  isValidPlayerPasscode,
  isValidPlayerUsername,
} from "@/lib/cloud/playerAccess";
import { useNameAvailability } from "@/lib/cloud/useNameAvailability";
import { matchesPlayerNameQuery } from "@/utils/playerDisplayName";

export type PlayerAccessMode =
  | "existing-player"
  | "existing-guest"
  | "new-guest"
  /** The credentials the new guest needs, held on screen until dismissed. */
  | "guest-created"
  | "passcode"
  | null;

export type PlayerAccessOption = {
  id: string;
  name?: string;
  isGuest?: boolean;
  hasPasscode?: boolean;
};

type Props = {
  mode: PlayerAccessMode;
  candidates: PlayerAccessOption[];
  pendingPlayer: PlayerAccessOption | null;
  createdGuest?: { username: string; passcode: string } | null;
  purpose?: "game" | "group";
  verificationProgress?: string | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSelectExisting: (player: PlayerAccessOption) => void;
  onCreateGuest: (input: { username: string; passcode: string }) => void;
  onVerify: (passcode: string) => void;
};

function keepOpen() {}

export default function PlayerAccessModal({
  mode,
  candidates,
  pendingPlayer,
  createdGuest = null,
  purpose = "game",
  verificationProgress = null,
  busy,
  error,
  onClose,
  onSelectExisting,
  onCreateGuest,
  onVerify,
}: Props) {
  const [query, setQuery] = useState("");
  const [username, setUsername] = useState("");
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");

  useEffect(() => {
    setQuery("");
    setUsername("");
    setPasscode("");
    setConfirmPasscode("");
  }, [mode, pendingPlayer?.id]);

  const filteredCandidates = useMemo(
    () => candidates.filter((player) => matchesPlayerNameQuery(player, query)),
    [candidates, query],
  );

  const usernameAvailability = useNameAvailability(
    mode === "new-guest" ? username : "",
  );

  const newGuestReady =
    isValidPlayerUsername(username) &&
    isValidPlayerPasscode(passcode) &&
    passcode === confirmPasscode &&
    usernameAvailability !== "taken";

  // The guest-created card holds the only copy of the new guest's passcode, so
  // a stray tap outside it or the Android back button must not throw that away.
  // Only Done or the close button, both deliberate, dismiss it.
  const dismissFromOutside = mode === "guest-created" ? keepOpen : onClose;

  const isPicker = mode === "existing-player" || mode === "existing-guest";
  const title =
    mode === "existing-player"
      ? "Existing player"
      : mode === "existing-guest"
        ? "Existing guest"
        : mode === "new-guest"
          ? "New guest"
          : mode === "guest-created"
            ? "Guest added"
            : `Verify ${pendingPlayer?.name ?? "player"}`;

  async function shareGuestCredentials() {
    if (!createdGuest) {
      return;
    }

    try {
      await Share.share({
        message: `Your seat in Moonraker's Analytics is ready.\n\nUsername: ${createdGuest.username}\nPasscode: ${createdGuest.passcode}\n\nKeep both — you will need them to claim your games when you make an account.`,
      });
    } catch {
      // Dismissing the share sheet is not a failure worth reporting; the card
      // is still on screen to read from.
    }
  }

  return (
    <Modal
      visible={mode !== null}
      transparent
      animationType="fade"
      onRequestClose={dismissFromOutside}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissFromOutside} />
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>
                {purpose === "group" ? "Save verified group" : "Add to game"}
              </Text>
              <Text style={styles.title}>{title}</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={styles.closeButton}
            >
              <Text style={styles.closeText}>×</Text>
            </Pressable>
          </View>

          {isPicker ? (
            <>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search usernames"
                placeholderTextColor="#7D9BC4"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
              <ScrollView
                style={styles.candidateViewport}
                contentContainerStyle={styles.candidateList}
                keyboardShouldPersistTaps="handled"
              >
                {filteredCandidates.length ? (
                  filteredCandidates.map((player) => (
                    <Pressable
                      key={player.id}
                      onPress={() => onSelectExisting(player)}
                      style={({ pressed }) => [
                        styles.candidate,
                        pressed && styles.candidatePressed,
                      ]}
                    >
                      <View style={styles.candidateCopy}>
                        <Text style={styles.candidateName}>{player.name}</Text>
                        <Text style={styles.candidateMeta}>
                          {player.hasPasscode
                            ? "Passcode required"
                            : "Passcode must be set first"}
                        </Text>
                      </View>
                      <Text style={styles.candidateArrow}>›</Text>
                    </Pressable>
                  ))
                ) : (
                  <Text style={styles.emptyText}>No matching usernames.</Text>
                )}
              </ScrollView>
            </>
          ) : null}

          {mode === "new-guest" ? (
            <View style={styles.form}>
              <Text style={styles.helpText}>
                This creates a complete guest profile that can later be claimed during
                registration with this username and passcode.
              </Text>
              <TextInput
                value={username}
                onChangeText={setUsername}
                placeholder="Username"
                placeholderTextColor="#7D9BC4"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
              />
              {usernameAvailability === "taken" ? (
                <Text style={styles.errorText}>
                  {username.trim()} is already taken by a player or another guest.
                </Text>
              ) : usernameAvailability === "free" ? (
                <Text style={styles.okText}>{username.trim()} is free.</Text>
              ) : null}
              <TextInput
                value={passcode}
                onChangeText={setPasscode}
                placeholder="Passcode (3–8 letters or numbers)"
                placeholderTextColor="#7D9BC4"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                style={styles.input}
              />
              <TextInput
                value={confirmPasscode}
                onChangeText={setConfirmPasscode}
                placeholder="Confirm passcode"
                placeholderTextColor="#7D9BC4"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                style={styles.input}
              />
              {confirmPasscode && passcode !== confirmPasscode ? (
                <Text style={styles.errorText}>Passcodes do not match.</Text>
              ) : null}
              <ActionButton
                title={busy ? "Creating..." : "Create and add guest"}
                disabled={!newGuestReady || busy}
                onPress={() => onCreateGuest({ username, passcode })}
              />
            </View>
          ) : null}

          {mode === "guest-created" && createdGuest ? (
            <View style={styles.form}>
              <Text style={styles.helpText}>
                {createdGuest.username} is in the game. Give them both of these —
                the passcode is not shown again, and they will need the pair to
                claim their games when they make an account.
              </Text>

              <View style={styles.handoffCard}>
                <View style={styles.handoffRow}>
                  <Text style={styles.handoffLabel}>Username</Text>
                  <Text selectable style={styles.handoffValue}>
                    {createdGuest.username}
                  </Text>
                </View>
                <View style={styles.handoffRow}>
                  <Text style={styles.handoffLabel}>Passcode</Text>
                  <Text selectable style={styles.handoffValue}>
                    {createdGuest.passcode}
                  </Text>
                </View>
              </View>

              <ActionButton
                title="Share"
                onPress={() => {
                  void shareGuestCredentials();
                }}
              />
              <ActionButton title="Done" variant="ghost" onPress={onClose} />
            </View>
          ) : null}

          {mode === "passcode" ? (
            <View style={styles.form}>
              <Text style={styles.helpText}>
                {purpose === "group"
                  ? `Enter ${pendingPlayer?.name ?? "this player's"} passcode${
                      verificationProgress ? ` (${verificationProgress})` : ""
                    }. Each member approves this saved group once; future setup can load the unchanged group without re-entering passcodes.`
                  : `Enter ${pendingPlayer?.name ?? "this player's"} passcode. Approval lasts only for this host and game draft.`}
              </Text>
              {pendingPlayer?.hasPasscode === false ? (
                <Text style={styles.errorText}>
                  This profile has no passcode yet. The player must set one in Profile
                  Settings before another host can add them.
                </Text>
              ) : null}
              <TextInput
                value={passcode}
                onChangeText={setPasscode}
                placeholder="Passcode"
                placeholderTextColor="#7D9BC4"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                style={styles.input}
                onSubmitEditing={() => {
                  if (isValidPlayerPasscode(passcode) && !busy) onVerify(passcode);
                }}
              />
              <ActionButton
                title={
                  busy
                    ? "Verifying..."
                    : purpose === "group"
                      ? "Verify and continue"
                      : "Verify and add"
                }
                disabled={
                  !isValidPlayerPasscode(passcode) ||
                  pendingPlayer?.hasPasscode === false ||
                  busy
                }
                onPress={() => onVerify(passcode)}
              />
            </View>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(2, 6, 23, 0.78)",
  },
  card: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "82%",
    alignSelf: "center",
    gap: 14,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.3)",
    backgroundColor: "#07111F",
    padding: 18,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  headerCopy: { flex: 1, gap: 3 },
  eyebrow: {
    color: "#67E8F9",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: { color: "#FFFFFF", fontSize: 22, fontWeight: "900" },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  closeText: { color: "#D7E7FF", fontSize: 27, lineHeight: 29 },
  input: {
    minHeight: 48,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.22)",
    backgroundColor: "rgba(9,20,38,0.98)",
    color: "#FFFFFF",
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  candidateViewport: { maxHeight: 360 },
  candidateList: { gap: 8, paddingBottom: 2 },
  candidate: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  candidatePressed: { backgroundColor: "rgba(96,165,250,0.14)" },
  candidateCopy: { flex: 1, gap: 3 },
  candidateName: { color: "#F8FBFF", fontSize: 16, fontWeight: "900" },
  candidateMeta: { color: "#9CB5D8", fontSize: 12, fontWeight: "700" },
  candidateArrow: { color: "#93C5FD", fontSize: 28, fontWeight: "700" },
  emptyText: { color: "#9CB5D8", textAlign: "center", paddingVertical: 24 },
  form: { gap: 12 },
  helpText: { color: "#C6D8F6", fontSize: 13, lineHeight: 19 },
  errorText: { color: "#FCA5A5", fontSize: 12, lineHeight: 18, fontWeight: "700" },
  okText: { color: "#6EE7B7", fontSize: 12, lineHeight: 18, fontWeight: "700" },
  handoffCard: {
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.34)",
    backgroundColor: "rgba(103,232,249,0.10)",
    padding: 14,
  },
  handoffRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  handoffLabel: { color: "#9CB5D8", fontSize: 12, fontWeight: "700" },
  handoffValue: {
    color: "#F8FBFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.4,
  },
});
