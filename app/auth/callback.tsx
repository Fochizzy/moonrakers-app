import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import type { EmailOtpType } from "@supabase/supabase-js";

import ActionButton from "@/components/ui/ActionButton";
import AppHeader from "@/components/ui/AppHeader";
import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import { readAuthCallbackParams } from "@/lib/auth/handleAuthCallback";
import {
  clearPendingAuthIntent,
  writePendingAuthIntent,
} from "@/lib/auth/pendingAuthIntent";
import { buildSupabaseRedirectUrl, supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { useTheme } from "@/theme";
import { APP_ROUTES, buildHomeRoute } from "@/utils/appRoutes";

type CallbackRouteParams = {
  access_token?: string | string[];
  refresh_token?: string | string[];
  code?: string | string[];
  token_hash?: string | string[];
  token?: string | string[];
  type?: string | string[];
  confirmation_url?: string | string[];
  error_code?: string | string[];
  error_description?: string | string[];
};

function normalizeRouteParam(
  value: string | string[] | undefined,
): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function buildRouteCallbackUrl(params: CallbackRouteParams) {
  const queryParams = new URLSearchParams();
  const entries = [
    ["access_token", normalizeRouteParam(params.access_token)],
    ["refresh_token", normalizeRouteParam(params.refresh_token)],
    ["code", normalizeRouteParam(params.code)],
    ["token_hash", normalizeRouteParam(params.token_hash)],
    ["token", normalizeRouteParam(params.token)],
    ["type", normalizeRouteParam(params.type)],
    ["confirmation_url", normalizeRouteParam(params.confirmation_url)],
    ["error_code", normalizeRouteParam(params.error_code)],
    ["error_description", normalizeRouteParam(params.error_description)],
  ] as const;

  for (const [key, value] of entries) {
    if (value) {
      queryParams.set(key, value);
    }
  }

  if (!queryParams.toString()) {
    return null;
  }

  return `${buildSupabaseRedirectUrl()}?${queryParams.toString()}`;
}

export default function AuthCallbackScreen() {
  const router = useRouter();
  const theme = useTheme();
  const url = Linking.useURL();
  const routeParams = useLocalSearchParams<CallbackRouteParams>();
  const setPasswordRecoveryPending = useStore(
    (state) => state.setPasswordRecoveryPending,
  );
  const [message, setMessage] = useState("Finishing sign-in...");
  const [resolved, setResolved] = useState(false);

  const showBackAction = useMemo(() => resolved, [resolved]);

  useEffect(() => {
    let active = true;

    function normalizeOtpType(value: string | null): EmailOtpType | null {
      switch (value) {
        case "signup":
        case "invite":
        case "magiclink":
        case "recovery":
        case "email_change":
        case "email":
          return value;
        default:
          return null;
      }
    }

    async function applyCallback(currentUrl: string) {
      const {
        accessToken,
        refreshToken,
        code,
        tokenHash,
        type,
        errorCode,
        errorDescription,
      } = readAuthCallbackParams(currentUrl);
      const otpType = normalizeOtpType(type);
      let error: Error | null = null;

      if (errorCode) {
        if (active) {
          setMessage(errorDescription ?? errorCode);
          setResolved(true);
        }
        return true;
      }

      if (accessToken && refreshToken) {
        const result = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        error = result.error;
      } else if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code);
        error = result.error;
      } else if (tokenHash && otpType) {
        const result = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: otpType,
        });
        error = result.error;
      } else {
        return false;
      }

      if (!active) {
        return true;
      }

      if (error) {
        setMessage(error.message);
        setResolved(true);
        return true;
      }

      if (type === "recovery") {
        await writePendingAuthIntent("recovery-ready");
        setPasswordRecoveryPending(true);
        setMessage("Opening password reset...");
        router.replace(APP_ROUTES.resetPassword);
        return true;
      }

      await clearPendingAuthIntent();
      setPasswordRecoveryPending(false);
      router.replace(buildHomeRoute());
      return true;
    }

    async function resolveCallback() {
      const initialUrl = await Linking.getInitialURL();
      const routeUrl = buildRouteCallbackUrl(routeParams);
      const candidates = [url, initialUrl, routeUrl].filter(
        (value, index, allValues): value is string =>
          typeof value === "string" &&
          value.length > 0 &&
          allValues.indexOf(value) === index,
      );

      for (const candidate of candidates) {
        const handled = await applyCallback(candidate);
        if (handled) {
          return;
        }
      }

      if (active) {
        setMessage("The auth callback opened, but the email link did not deliver usable auth data.");
        setResolved(true);
      }
    }

    void resolveCallback();

    return () => {
      active = false;
    };
  }, [routeParams, router, setPasswordRecoveryPending, url]);

  return (
    <PageShell
      preset="auth"
      scroll={false}
      edges={["top", "left", "right", "bottom"]}
      contentContainerStyle={styles.pageContent}
    >
      <View style={styles.stack}>
        <AppHeader
          eyebrow="Moonrakers Command"
          title="Authorizing"
          subtitle="Finishing sign-in."
          identity="emblem"
        />

        <SectionCard
          eyebrow="Auth Callback"
          title="Processing secure access"
          subtitle="Exchanging your email link for a session."
        >
          <View style={styles.statusWrap}>
            <ActivityIndicator color={theme.colors.accent.info} size="large" />
            <Text style={styles.message}>{message}</Text>
          </View>

          {showBackAction ? (
            <ActionButton
              variant="ghost"
              onPress={() => router.replace(APP_ROUTES.login)}
              title="Back To Login"
            />
          ) : null}
        </SectionCard>
      </View>
    </PageShell>
  );
}

const styles = StyleSheet.create({
  pageContent: {
    flex: 1,
    justifyContent: "center",
  },
  stack: {
    gap: 16,
  },
  statusWrap: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  message: {
    textAlign: "center",
    fontSize: 14,
    lineHeight: 20,
  },
});
