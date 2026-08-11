import React, { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";

import ActionButton from "@/components/ui/ActionButton";
import PageShell from "@/components/ui/PageShell";
import Text from "@/components/ui/Text";
import {
  clearRememberedLogin,
  readRememberedLogin,
  writeRememberedLogin,
} from "@/lib/auth/rememberedLogin";
import { clearPendingAuthIntent } from "@/lib/auth/pendingAuthIntent";
import {
  buildSupabaseRedirectUrl,
  formatSupabaseConfigError,
  supabase,
} from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { APP_ROUTES, buildHomeRoute } from "@/utils/appRoutes";

type ActiveAction = "login" | "resend" | "reset" | null;
const APP_ICON = require("@/assets/icon.png");

function formatAuthMessage(error: unknown) {
  const message = formatSupabaseConfigError(error);

  if (message.toLowerCase() === "invalid login credentials") {
    return "Invalid credentials. If you never confirmed your account, resend the confirmation email below.";
  }

  return message;
}

export default function LoginScreen() {
  const router = useRouter();
  const clearAuthState = useStore((state) => state.clearAuthState);
  const setPasswordRecoveryPending = useStore(
    (state) => state.setPasswordRecoveryPending,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [activeAction, setActiveAction] = useState<ActiveAction>(null);
  const [message, setMessage] = useState<string | null>(null);

  const normalizedEmail = email.trim();
  const busy = activeAction !== null;
  const canSubmit = normalizedEmail.length > 0 && password.trim().length > 0;
  const canSendEmail = normalizedEmail.length > 0;

  useEffect(() => {
    let active = true;

    async function ensureLoggedOutForLoginScreen() {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!active) {
          return;
        }

        if (error) {
          return;
        }

        if (!data.session?.user?.id) {
          await clearPendingAuthIntent();
          setPasswordRecoveryPending(false);
          clearAuthState();
          return;
        }

        await supabase.auth.signOut();
      } catch {
        // Best effort. The root auth listener will reconcile any remaining state.
      } finally {
        if (active) {
          await clearPendingAuthIntent();
          setPasswordRecoveryPending(false);
          clearAuthState();
        }
      }
    }

    void ensureLoggedOutForLoginScreen();

    return () => {
      active = false;
    };
  }, [clearAuthState, setPasswordRecoveryPending]);

  useEffect(() => {
    let active = true;

    async function hydrateRememberedLogin() {
      try {
        const rememberedLogin = await readRememberedLogin();

        if (!active || !rememberedLogin) {
          return;
        }

        setEmail(rememberedLogin.email);
        setPassword(rememberedLogin.password);
        setRememberMe(true);
      } catch (error) {
        console.warn("Failed to load remembered login.", error);
      }
    }

    void hydrateRememberedLogin();

    return () => {
      active = false;
    };
  }, []);

  async function handleRememberMeToggle() {
    const nextValue = !rememberMe;

    setRememberMe(nextValue);

    if (!nextValue) {
      try {
        await clearRememberedLogin();
      } catch (error) {
        console.warn("Failed to clear remembered login.", error);
      }
    }
  }

  async function handleLogin() {
    if (!canSubmit || busy) {
      return;
    }

    setActiveAction("login");
    setMessage(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (error) {
        setMessage(formatAuthMessage(error));
        setActiveAction(null);
        return;
      }

      try {
        if (rememberMe) {
          await writeRememberedLogin({
            email: normalizedEmail,
            password,
          });
        } else {
          await clearRememberedLogin();
        }
      } catch (storageError) {
        console.warn("Failed to update remembered login.", storageError);
      }

      setPasswordRecoveryPending(false);
      await clearPendingAuthIntent();
      setActiveAction(null);
      router.replace(buildHomeRoute());
    } catch (error) {
      setMessage(formatAuthMessage(error));
      setActiveAction(null);
    }
  }

  async function handleResendConfirmation() {
    if (!canSendEmail || busy) {
      return;
    }

    setActiveAction("resend");
    setMessage(null);

    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email: normalizedEmail,
        options: {
          emailRedirectTo: buildSupabaseRedirectUrl("moonrakers", {
            type: "email",
          }),
        },
      });

      if (error) {
        throw error;
      }

      setMessage("Confirmation email sent. Open it on this device to finish signing in.");
    } catch (error) {
      setMessage(formatAuthMessage(error));
    } finally {
      setActiveAction(null);
    }
  }

  async function handleResetPassword() {
    if (!canSendEmail || busy) {
      return;
    }

    setActiveAction("reset");
    setMessage(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        normalizedEmail,
        {
          redirectTo: buildSupabaseRedirectUrl("moonrakers", {
            type: "recovery",
          }),
        },
      );

      if (error) {
        throw error;
      }

      setPasswordRecoveryPending(false);
      await clearPendingAuthIntent();
      setMessage("Password reset email sent. Open it on this device to choose a new password.");
    } catch (error) {
      setMessage(formatAuthMessage(error));
      setPasswordRecoveryPending(false);
      await clearPendingAuthIntent();
    } finally {
      setActiveAction(null);
    }
  }

  return (
    <PageShell
      preset="authHero"
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
          <View style={styles.brandIconWrap}>
            <Image source={APP_ICON} style={styles.brandIcon} resizeMode="cover" />
          </View>

          <View
            style={[
              styles.panel,
              {
                backgroundColor: "rgba(4,10,24,0.8)",
                borderColor: "rgba(96,165,250,0.16)",
              },
            ]}
          >
            <View style={styles.copy}>
              <Text style={styles.title}>Log in</Text>
              <Text style={styles.subtitle}>Use your account.</Text>
              <Text style={styles.explainer}>One registered host can launch a table</Text>
            </View>

            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              placeholder="Email"
              placeholderTextColor="#6E7F9D"
              style={[
                styles.input,
                {
                  backgroundColor: "rgba(15,25,48,0.72)",
                  borderColor: "rgba(59,130,246,0.24)",
                  color: "#F8FBFF",
                },
              ]}
              value={email}
              onChangeText={setEmail}
            />

            <View
              style={[
                styles.passwordField,
                {
                  backgroundColor: "rgba(15,25,48,0.72)",
                  borderColor: "rgba(59,130,246,0.24)",
                },
              ]}
            >
              <TextInput
                autoCapitalize="none"
                autoCorrect={false}
                placeholder="Password"
                placeholderTextColor="#6E7F9D"
                secureTextEntry={!passwordVisible}
                style={[
                  styles.passwordInput,
                  {
                    color: "#F8FBFF",
                  },
                ]}
                value={password}
                onChangeText={setPassword}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
                hitSlop={8}
                onPress={() => setPasswordVisible((current) => !current)}
                style={({ pressed }) => [
                  styles.passwordToggle,
                  {
                    opacity: pressed ? 0.78 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={passwordVisible ? "eye-off" : "eye"}
                  size={20}
                  color="#B7C8E6"
                />
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: rememberMe }}
              onPress={() => {
                void handleRememberMeToggle();
              }}
              style={({ pressed }) => [
                styles.rememberRow,
                {
                  opacity: pressed ? 0.86 : 1,
                },
              ]}
            >
              <View
                style={[
                  styles.checkbox,
                  rememberMe
                    ? {
                        backgroundColor: "rgba(114,170,211,0.76)",
                        borderColor: "rgba(147,197,253,0.52)",
                      }
                    : {
                        backgroundColor: "rgba(15,25,48,0.4)",
                        borderColor: "rgba(59,130,246,0.24)",
                      },
                ]}
              >
                {rememberMe ? <View style={styles.checkboxInner} /> : null}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </Pressable>

            {message ? (
              <Text
                style={[
                  styles.message,
                  {
                    color: "#C7D6F3",
                  },
                ]}
              >
                {message}
              </Text>
            ) : null}

            <View style={styles.actions}>
              <ActionButton
                title={activeAction === "login" ? "Logging in..." : "Log in"}
                disabled={!canSubmit || busy}
                onPress={handleLogin}
                style={styles.loginPrimaryButton}
              />

              <ActionButton
                title={activeAction === "reset" ? "Sending..." : "Reset password email"}
                variant="secondary"
                disabled={!canSendEmail || busy}
                onPress={handleResetPassword}
              />

              <ActionButton
                title="Create account"
                variant="secondary"
                disabled={busy}
                onPress={() => router.push(APP_ROUTES.register as any)}
              />

              <ActionButton
                title={activeAction === "resend" ? "Sending..." : "Resend confirmation email"}
                variant="ghost"
                disabled={!canSendEmail || busy}
                onPress={handleResendConfirmation}
              />
            </View>
          </View>
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
    gap: 14,
  },
  brandIconWrap: {
    alignItems: "center",
  },
  brandIcon: {
    width: 100,
    height: 100,
    borderRadius: 28,
    shadowColor: "#020617",
    shadowOpacity: 0.34,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  panel: {
    borderRadius: 30,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 12,
    shadowColor: "#020617",
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
  copy: {
    gap: 8,
    paddingRight: 8,
  },
  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "900",
    color: "#F8FBFF",
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#D7E1F4",
  },
  explainer: {
    fontSize: 12,
    lineHeight: 17,
    color: "#7D9BC4",
    fontWeight: "600",
  },
  input: {
    minHeight: 58,
    borderRadius: 18,
    paddingHorizontal: 16,
    borderWidth: 1,
    fontSize: 16,
  },
  passwordField: {
    minHeight: 58,
    borderRadius: 18,
    paddingLeft: 16,
    paddingRight: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  passwordInput: {
    flex: 1,
    minHeight: 56,
    fontSize: 16,
    paddingRight: 10,
  },
  passwordToggle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    fontSize: 13,
    lineHeight: 18,
  },
  rememberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    paddingVertical: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 3,
    backgroundColor: "#18324F",
  },
  rememberText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: "700",
    color: "#D7E1F4",
  },
  actions: {
    gap: 10,
    marginTop: 2,
  },
  loginPrimaryButton: {
    minHeight: 58,
  },
});
