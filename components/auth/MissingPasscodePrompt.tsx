import React, { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import ActionButton from "@/components/ui/ActionButton";
import Text from "@/components/ui/Text";
import { isValidPlayerPasscode } from "@/lib/cloud/playerAccess";

type Props = {
  visible: boolean;
  username: string;
  busy: boolean;
  error: string | null;
  onSave: (passcode: string) => void;
  onDismiss: () => void;
};

export default function MissingPasscodePrompt({
  visible,
  username,
  busy,
  error,
  onSave,
  onDismiss,
}: Props) {
  const [passcode, setPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");

  useEffect(() => {
    if (!visible) {
      setPasscode("");
      setConfirmPasscode("");
    }
  }, [visible]);

  const canSave =
    isValidPlayerPasscode(passcode) &&
    passcode === confirmPasscode &&
    !busy;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.overlay}
      >
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Secure your username</Text>
          <Text style={styles.title}>Add a player passcode</Text>
          <Text style={styles.helpText}>
            {username} does not have a passcode yet. Set one so other hosts can
            verify this username when adding it to a game.
          </Text>

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
            onSubmitEditing={() => {
              if (canSave) onSave(passcode);
            }}
          />

          {confirmPasscode && passcode !== confirmPasscode ? (
            <Text style={styles.errorText}>Passcodes do not match.</Text>
          ) : null}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <ActionButton
            title={busy ? "Saving..." : "Set passcode"}
            disabled={!canSave}
            onPress={() => onSave(passcode)}
          />
          <ActionButton
            title="Not now"
            variant="ghost"
            disabled={busy}
            onPress={onDismiss}
          />
          <Text style={styles.footerText}>
            You can set or change this later under Manage Users & Groups.
          </Text>
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
    backgroundColor: "rgba(2, 6, 23, 0.82)",
  },
  card: {
    width: "100%",
    maxWidth: 460,
    alignSelf: "center",
    gap: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.32)",
    backgroundColor: "#07111F",
    padding: 20,
  },
  eyebrow: {
    color: "#67E8F9",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  title: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
  },
  helpText: {
    color: "#C6D8F6",
    fontSize: 14,
    lineHeight: 20,
  },
  input: {
    backgroundColor: "#081426",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(67,117,183,0.24)",
    color: "#FFFFFF",
    fontSize: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  errorText: {
    color: "#FCA5A5",
    fontSize: 12,
    fontWeight: "700",
  },
  footerText: {
    color: "#7D9BC4",
    fontSize: 11,
    lineHeight: 17,
    textAlign: "center",
  },
});
