import "react-native-gesture-handler";

import React, { useEffect, useRef } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import * as Linking from "expo-linking";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import Text from "@/components/ui/Text";
import {
  formatSupabaseConfigError,
  supabase,
} from "@/lib/supabase";
import {
  hasAuthCallbackPayload,
  isAuthCallbackUrl,
} from "@/lib/auth/handleAuthCallback";
import { resolveLaunchRoute } from "@/lib/auth/launchRoute";
import {
  clearPendingAuthIntent,
  readPendingAuthIntent,
} from "@/lib/auth/pendingAuthIntent";
import { loadCloudSnapshot } from "@/lib/cloud/loadCloudSnapshot";
import { isDeletedAtColumnMissingError } from "@/lib/cloud/profileSoftDeleteCompat";
import { loadRegisteredProfiles } from "@/lib/cloud/loadRegisteredProfiles";
import { loadStatsSnapshot } from "@/lib/cloud/loadStatsSnapshot";
import {
  type AuthProfile,
  type AuthSession,
  useStore,
} from "@/store/useStore";
import { ThemeProvider, useTheme } from "@/theme";
import { APP_ROUTES } from "@/utils/appRoutes";
import { mergeRegisteredProfilesIntoPlayers } from "@/utils/registeredProfilePlayer";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const PUBLIC_AUTH_ROUTES = new Set<string>([
  APP_ROUTES.login,
  APP_ROUTES.register,
  APP_ROUTES.authCallback,
  APP_ROUTES.resetPassword,
]);

const STAR_POSITIONS = [
  { top: 28, left: 24, size: 2, opacity: 0.55 },
  { top: 52, left: 88, size: 2, opacity: 0.9 },
  { top: 74, left: 164, size: 1.5, opacity: 0.5 },
  { top: 96, left: 304, size: 2, opacity: 0.7 },
  { top: 118, left: 222, size: 1.5, opacity: 0.65 },
  { top: 142, left: 48, size: 2, opacity: 0.8 },
  { top: 170, left: 134, size: 1.5, opacity: 0.45 },
  { top: 194, left: 278, size: 2, opacity: 0.75 },
  { top: 228, left: 18, size: 1.5, opacity: 0.55 },
  { top: 250, left: 112, size: 2, opacity: 0.85 },
  { top: 276, left: 196, size: 1.5, opacity: 0.6 },
  { top: 302, left: 326, size: 2, opacity: 0.8 },
  { top: 332, left: 72, size: 1.5, opacity: 0.5 },
  { top: 360, left: 154, size: 2, opacity: 0.72 },
  { top: 388, left: 246, size: 1.5, opacity: 0.9 },
  { top: 414, left: 344, size: 2, opacity: 0.58 },
  { top: 448, left: 36, size: 1.5, opacity: 0.68 },
  { top: 472, left: 126, size: 2, opacity: 0.82 },
  { top: 498, left: 214, size: 1.5, opacity: 0.52 },
  { top: 524, left: 292, size: 2, opacity: 0.76 },
  { top: 552, left: 82, size: 1.5, opacity: 0.62 },
  { top: 578, left: 176, size: 2, opacity: 0.92 },
  { top: 606, left: 332, size: 1.5, opacity: 0.55 },
  { top: 632, left: 52, size: 2, opacity: 0.72 },
  { top: 662, left: 146, size: 1.5, opacity: 0.47 },
  { top: 688, left: 236, size: 2, opacity: 0.84 },
  { top: 714, left: 314, size: 1.5, opacity: 0.62 },
  { top: 742, left: 98, size: 2, opacity: 0.75 },
  { top: 768, left: 192, size: 1.5, opacity: 0.54 },
  { top: 792, left: 276, size: 2, opacity: 0.88 },
  { top: 826, left: 26, size: 1.5, opacity: 0.42 },
  { top: 854, left: 122, size: 2, opacity: 0.78 },
  { top: 880, left: 208, size: 1.5, opacity: 0.58 },
  { top: 906, left: 336, size: 2, opacity: 0.7 },
  { top: 936, left: 64, size: 1.5, opacity: 0.64 },
  { top: 962, left: 158, size: 2, opacity: 0.87 },
  { top: 988, left: 252, size: 1.5, opacity: 0.49 },
  { top: 1014, left: 308, size: 2, opacity: 0.79 },
  { top: 1046, left: 40, size: 1.5, opacity: 0.53 },
  { top: 1072, left: 182, size: 2, opacity: 0.9 },
];

function normalizeAuthSession(sessionLike: unknown): AuthSession {
  if (!sessionLike || typeof sessionLike !== "object") {
    return null;
  }

  const user = (sessionLike as { user?: { id?: unknown; email?: unknown } }).user;
  const userId = String(user?.id ?? "").trim();

  if (!userId) {
    return null;
  }

  const email =
    typeof user?.email === "string" && user.email.trim().length > 0
      ? user.email.trim()
      : null;

  return {
    user: {
      id: userId,
      email,
    },
  };
}

async function loadAuthProfile(userId: string): Promise<AuthProfile> {
  let { data, error } = await supabase
    .from("profiles")
    .select("id, player_name, display_name, favorite_color, assigned_card_art_index")
    .eq("id", userId)
    .is("deleted_at", null)
    .maybeSingle();

  if (isDeletedAtColumnMissingError(error)) {
    ({ data, error } = await supabase
      .from("profiles")
      .select("id, player_name, display_name, favorite_color, assigned_card_art_index")
      .eq("id", userId)
      .maybeSingle());
  }

  if (error) {
    throw error;
  }

  if (!data?.id) {
    return null;
  }

  return {
    id: data.id,
    player_name: data.player_name ?? null,
    display_name: data.display_name ?? null,
    favorite_color: data.favorite_color ?? null,
    assigned_card_art_index: data.assigned_card_art_index ?? null,
  };
}

async function loadHydratedSharedSnapshot(session: AuthSession) {
  if (!session?.user?.id) {
    throw new Error("Signed-in session required to hydrate the shared cloud snapshot.");
  }

  const [snapshot, registeredProfiles] = await Promise.all([
    loadCloudSnapshot(session.user.id),
    loadRegisteredProfiles().catch(() => []),
  ]);
  const statsSnapshot = await loadStatsSnapshot({
    profileId: session.user.id,
    groups: snapshot.groups,
    games: snapshot.games,
  });

  return {
    session,
    snapshot: {
      ...snapshot,
      players: mergeRegisteredProfilesIntoPlayers(snapshot.players, registeredProfiles),
    },
    statsSnapshot,
  };
}

function StarField() {
  return (
    <View style={styles.starField} pointerEvents="none">
      {STAR_POSITIONS.map((star, index) => (
        <View
          key={`star-${index}`}
          style={[
            styles.star,
            {
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              opacity: star.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

function AppBackground() {
  return (
    <>
      <View style={styles.baseBg} pointerEvents="none" />
      <StarField />
      <View style={styles.nebulaPurple} pointerEvents="none" />
      <View style={styles.nebulaBlue} pointerEvents="none" />
      <View style={styles.topGlow} pointerEvents="none" />
      <View style={styles.sideGlow} pointerEvents="none" />
      <View style={styles.bottomGlow} pointerEvents="none" />
      <View style={styles.orbitRing} pointerEvents="none" />
      <View style={styles.orbitRingSecondary} pointerEvents="none" />
      <View style={styles.gridFade} pointerEvents="none" />
    </>
  );
}

function LoadingOverlay({
  message,
  showAction,
  onAction,
}: {
  message: string;
  showAction: boolean;
  onAction: () => void | Promise<void>;
}) {
  return (
    <View style={styles.overlayBackdrop}>
      <View style={styles.overlayCard}>
        <ActivityIndicator color="#60A5FA" size="large" />
        <Text style={styles.overlayTitle}>Loading account</Text>
        <Text style={styles.overlayMessage}>{message}</Text>
        {showAction ? (
          <Pressable onPress={onAction} style={styles.overlayButton}>
            <Text style={styles.overlayButtonText}>Go to login</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function AppNavigator() {
  const theme = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const authSession = useStore((state) => state.authSession);
  const authProfile = useStore((state) => state.authProfile);
  const authBootstrapStatus = useStore((state) => state.authBootstrapStatus);
  const authError = useStore((state) => state.authError);
  const passwordRecoveryPending = useStore(
    (state) => state.passwordRecoveryPending,
  );

  const setAuthSession = useStore((state) => state.setAuthSession);
  const setAuthProfile = useStore((state) => state.setAuthProfile);
  const setAuthBootstrapStatus = useStore(
    (state) => state.setAuthBootstrapStatus,
  );
  const setAuthError = useStore((state) => state.setAuthError);
  const setPasswordRecoveryPending = useStore(
    (state) => state.setPasswordRecoveryPending,
  );
  const setStatsSnapshot = useStore((state) => state.setStatsSnapshot);
  const hydrateAuthBootstrap = useStore((state) => state.hydrateAuthBootstrap);
  const hydrateCloudSnapshot = useStore((state) => state.hydrateCloudSnapshot);
  const clearAuthState = useStore((state) => state.clearAuthState);
  const setPlayers = useStore((state) => state.setPlayers);
  const setGroups = useStore((state) => state.setGroups);
  const setGames = useStore((state) => state.setGames);

  const bootstrapIdRef = useRef(0);
  const sharedRefreshIdRef = useRef(0);

  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.has(pathname);
  const showBlockingOverlay =
    !isPublicAuthRoute &&
    (authBootstrapStatus === "loading" || authBootstrapStatus === "error");

  useEffect(() => {
    let active = true;

    async function routeAuthUrl(url: string | null) {
      if (!active || !url) {
        return;
      }

      if (!isAuthCallbackUrl(url) || !hasAuthCallbackPayload(url)) {
        return;
      }

      router.replace({
        pathname: APP_ROUTES.authCallback,
        params: { confirmation_url: url },
      } as any);
    }

    void Linking.getInitialURL().then(routeAuthUrl);

    const subscription = Linking.addEventListener("url", (event) => {
      void routeAuthUrl(event.url);
    });

    return () => {
      active = false;
      subscription.remove();
    };
  }, [router]);

  useEffect(() => {
    let active = true;

    async function bootstrap(sessionOverride?: unknown) {
      const requestId = ++bootstrapIdRef.current;
      setAuthBootstrapStatus("loading");
      setAuthError(null);

      try {
        const pendingIntent = await readPendingAuthIntent();
        if (!active || requestId !== bootstrapIdRef.current) {
          return;
        }

        const session =
          sessionOverride !== undefined
            ? normalizeAuthSession(sessionOverride)
            : normalizeAuthSession((await supabase.auth.getSession()).data.session);

        if (!session?.user?.id) {
          clearAuthState();
          setPlayers([] as any);
          setGroups([] as any);
          setGames([] as any);
          setStatsSnapshot(null);
          setPasswordRecoveryPending(pendingIntent === "recovery-ready");
          setAuthBootstrapStatus("ready");
          return;
        }

        const profile = await loadAuthProfile(session.user.id);
        if (!active || requestId !== bootstrapIdRef.current) {
          return;
        }

        if (!profile?.player_name) {
          setPlayers([] as any);
          setGroups([] as any);
          setGames([] as any);
          setStatsSnapshot(null);
          setPasswordRecoveryPending(pendingIntent === "recovery-ready");
          hydrateAuthBootstrap({ session, profile });
          return;
        }

        const hydratedSnapshot = await loadHydratedSharedSnapshot(session);

        if (!active || requestId !== bootstrapIdRef.current) {
          return;
        }

        hydrateCloudSnapshot(hydratedSnapshot);
        setPasswordRecoveryPending(pendingIntent === "recovery-ready");
      } catch (error) {
        if (!active || requestId !== bootstrapIdRef.current) {
          return;
        }

        setAuthError(formatSupabaseConfigError(error));
        setAuthBootstrapStatus("error");
      }
    }

    void bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sessionLike) => {
      void bootstrap(sessionLike);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [
    clearAuthState,
    hydrateAuthBootstrap,
    hydrateCloudSnapshot,
    setAuthBootstrapStatus,
    setAuthError,
    setGames,
    setGroups,
    setPasswordRecoveryPending,
    setPlayers,
    setStatsSnapshot,
  ]);

  useEffect(() => {
    if (authBootstrapStatus !== "ready" || !authSession?.user?.id || !authProfile?.player_name) {
      return;
    }

    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    async function refreshSharedSnapshot() {
      const requestId = ++sharedRefreshIdRef.current;

      try {
        const hydratedSnapshot = await loadHydratedSharedSnapshot(authSession);
        if (!active || requestId !== sharedRefreshIdRef.current) {
          return;
        }

        hydrateCloudSnapshot(hydratedSnapshot);
      } catch (error) {
        if (!active || requestId !== sharedRefreshIdRef.current) {
          return;
        }

        console.warn("Failed to refresh shared cloud snapshot", error);
      }
    }

    function scheduleRefresh() {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }

      // Group writes emit related events back-to-back, so debounce one shared refresh.
      refreshTimer = setTimeout(() => {
        void refreshSharedSnapshot();
      }, 150);
    }

    const channel = supabase
      .channel(`moonrakers-shared-cloud:${authSession.user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "groups" },
        scheduleRefresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "group_members" },
        scheduleRefresh,
      )
      .subscribe();

    return () => {
      active = false;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      void supabase.removeChannel(channel);
    };
  }, [
    authBootstrapStatus,
    authProfile?.player_name,
    authSession,
    hydrateCloudSnapshot,
  ]);

  useEffect(() => {
    if (authBootstrapStatus !== "ready") {
      return;
    }

    if (pathname === APP_ROUTES.authCallback) {
      return;
    }

    const launchRoute = resolveLaunchRoute({
      session: authSession,
      profile: authProfile,
      passwordRecoveryPending,
    });

    if (launchRoute === APP_ROUTES.home) {
      if (PUBLIC_AUTH_ROUTES.has(pathname)) {
        router.replace(APP_ROUTES.home as any);
      }
      return;
    }

    if (launchRoute === APP_ROUTES.register) {
      if (pathname !== APP_ROUTES.register) {
        router.replace(APP_ROUTES.register as any);
      }
      return;
    }

    if (launchRoute === APP_ROUTES.resetPassword) {
      if (pathname !== APP_ROUTES.resetPassword) {
        router.replace(APP_ROUTES.resetPassword as any);
      }
      return;
    }

    if (launchRoute === APP_ROUTES.login && !PUBLIC_AUTH_ROUTES.has(pathname)) {
      router.replace(APP_ROUTES.login as any);
    }
  }, [
    authBootstrapStatus,
    authProfile,
    authSession,
    passwordRecoveryPending,
    pathname,
    router,
  ]);

  async function handleOverlayEscape() {
    try {
      await supabase.auth.signOut();
    } catch {
      // Best effort. We still want to clear local auth routing state.
    } finally {
      await clearPendingAuthIntent();
      setPasswordRecoveryPending(false);
      setAuthSession(null);
      setAuthProfile(null);
      setStatsSnapshot(null);
      setAuthError(null);
      setAuthBootstrapStatus("ready");
      router.replace(APP_ROUTES.login as any);
    }
  }

  return (
    <View
      style={[
        styles.appShell,
        { backgroundColor: theme.colors.background.primary },
      ]}
    >
      <AppBackground />

      <StatusBar style="light" translucent backgroundColor="transparent" />

      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade",
          contentStyle: {
            backgroundColor: "transparent",
          },
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="auth/callback" />
        <Stack.Screen name="reset-password" />
      </Stack>

      {showBlockingOverlay ? (
        <LoadingOverlay
          message={
            authError
              ? authError
              : "Restoring your Moonrakers session and profile."
          }
          showAction
          onAction={handleOverlayEscape}
        />
      ) : null}
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#02030A",
  },
  appShell: {
    flex: 1,
    position: "relative",
    overflow: "hidden",
  },
  baseBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#02030A",
  },
  starField: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.32,
  },
  star: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
  },
  nebulaPurple: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.12,
    left: SCREEN_WIDTH * 0.08,
    width: 280,
    height: 280,
    borderRadius: 180,
    backgroundColor: "rgba(168, 85, 247, 0.13)",
    transform: [{ scaleX: 1.08 }, { rotate: "8deg" }],
  },
  nebulaBlue: {
    position: "absolute",
    top: SCREEN_HEIGHT * 0.48,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 160,
    backgroundColor: "rgba(0, 191, 255, 0.10)",
    transform: [{ scaleX: 1.18 }, { rotate: "-12deg" }],
  },
  topGlow: {
    position: "absolute",
    top: -140,
    left: -60,
    right: -60,
    height: 320,
    borderRadius: 999,
    backgroundColor: "rgba(0, 191, 255, 0.18)",
    transform: [{ scaleX: 1.3 }, { rotate: "2deg" }],
  },
  sideGlow: {
    position: "absolute",
    right: -120,
    top: "25%",
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: "rgba(168, 85, 247, 0.22)",
  },
  bottomGlow: {
    position: "absolute",
    bottom: -140,
    left: -40,
    right: -40,
    height: 280,
    borderRadius: 999,
    backgroundColor: "rgba(168, 85, 247, 0.16)",
  },
  orbitRing: {
    position: "absolute",
    width: 500,
    height: 500,
    borderRadius: 250,
    borderWidth: 1,
    borderColor: "rgba(0,191,255,0.16)",
    top: SCREEN_HEIGHT * 0.2,
    left: -150,
    transform: [{ rotate: "25deg" }],
  },
  orbitRingSecondary: {
    position: "absolute",
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 1,
    borderColor: "rgba(192,132,252,0.14)",
    bottom: SCREEN_HEIGHT * 0.08,
    right: -90,
    transform: [{ rotate: "-18deg" }],
  },
  gridFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.015)",
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(2, 4, 12, 0.72)",
  },
  overlayCard: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.28)",
    backgroundColor: "rgba(6,10,22,0.96)",
    paddingHorizontal: 22,
    paddingVertical: 24,
    alignItems: "center",
    gap: 12,
  },
  overlayTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "900",
    textAlign: "center",
  },
  overlayMessage: {
    color: "#DCE8FF",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  overlayButton: {
    marginTop: 6,
    minHeight: 52,
    width: "100%",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(168,85,247,0.28)",
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.34)",
  },
  overlayButtonText: {
    color: "#F8FBFF",
    fontSize: 16,
    fontWeight: "900",
  },
});
