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
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import { clearPendingAuthIntent } from "@/lib/auth/pendingAuthIntent";
import { formatSupabaseConfigError, supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { useTheme } from "@/theme";
import { APP_ROUTES } from "@/utils/appRoutes";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const theme = useTheme();
  const setPasswordRecoveryPending = useStore(
    (state) => state.setPasswordRecoveryPending,
  );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasRecoverySession, setHasRecoverySession] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = useMemo(() => {
    if (checkingSession || submitting || !hasRecoverySession) {
      return false;
    }

    return password.length >= 6 && passwordsMatch;
  }, [
    checkingSession,
    hasRecoverySession,
    password.length,
    passwordsMatch,
    submitting,
  ]);

  useEffect(() => {
    let active = true;
    let authSubscription: { unsubscribe: () => void } | null = null;

    function applySessionState(sessionLike: { user?: { id?: string | null } } | null) {
      const hasSession = Boolean(sessionLike?.user?.id);
      setHasRecoverySession(hasSession);
      setCheckingSession(false);

      if (!hasSession) {
        setMessage("Open this screen from a password reset email on this device to choose a new password.");
        return;
      }

      setMessage(null);
    }

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession();

      if (!active) {
        return;
      }

      if (error) {
        setMessage(formatSupabaseConfigError(error));
        setCheckingSession(false);
        return;
      }

      applySessionState(data.session);

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, sessionLike) => {
        if (!active) {
          return;
        }

        applySessionState(sessionLike);
      });

      authSubscription = subscription;
    }

    void loadSession();

    return () => {
      active = false;
      authSubscription?.unsubscribe();
    };
  }, []);

  async function handleSavePassword() {
    if (!canSubmit) {
      if (!passwordsMatch) {
        setMessage("Passwords must match.");
      }
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      await clearPendingAuthIntent();
      setPasswordRecoveryPending(false);
      setMessage("Password updated. Redirecting back into Moonrakers...");
      router.replace(APP_ROUTES.home);
    } catch (error) {
      setMessage(formatSupabaseConfigError(error));
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    setSubmitting(true);
    setMessage(null);

    try {
      await supabase.auth.signOut();
    } catch {
      // Best-effort sign-out. We still want to clear the recovery redirect state.
    } finally {
      await clearPendingAuthIntent();
      setPasswordRecoveryPending(false);
      setSubmitting(false);
      router.replace(APP_ROUTES.login);
    }
  }

  return (
    <PageShell
      preset="auth"
      density="compact"
      viewport="fit"
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
            title="Reset Password"
            identity="emblem"
            size="compact"
            variant="compact"
          />

          <SectionCard
            eyebrow="Recovery Access"
            title="New password"
          >
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="New password (6+ characters)"
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

            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Confirm new password"
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
              value={confirmPassword}
              onChangeText={setConfirmPassword}
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
                disabled={!canSubmit}
                onPress={handleSavePassword}
                title={
                  checkingSession || submitting
                    ? "Saving..."
                    : "Save Password"
                }
                icon={
                  checkingSession || submitting ? (
                    <ActivityIndicator color={theme.colors.text.primary} size="small" />
                  ) : undefined
                }
              />

              <ActionButton
                variant="ghost"
                disabled={submitting}
                onPress={handleCancel}
                title={hasRecoverySession ? "Cancel" : "Back to Login"}
              />
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
