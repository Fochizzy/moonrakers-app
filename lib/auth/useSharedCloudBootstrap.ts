import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "expo-router";

import { clearPendingAuthIntent, readPendingAuthIntent } from "@/lib/auth/pendingAuthIntent";
import { resolveLaunchRoute } from "@/lib/auth/launchRoute";
import {
  loadAuthProfile,
  loadHydratedSharedSnapshot,
  normalizeAuthSession,
} from "@/lib/auth/bootstrapSharedCloudState";
import {
  clearCachedSnapshot,
  loadCachedSnapshot,
  startSnapshotCachePersistence,
} from "@/lib/cloud/snapshotCache";
import { useSyncedGameDraft } from "@/lib/game-draft/useSyncedGameDraft";
import { formatSupabaseConfigError, supabase } from "@/lib/supabase";
import { useStore } from "@/store/useStore";
import { APP_ROUTES, buildHomeRoute } from "@/utils/appRoutes";
import { remove } from "@/utils/storage/storage";

const PUBLIC_AUTH_ROUTES = new Set<string>([
  APP_ROUTES.login,
  APP_ROUTES.register,
  APP_ROUTES.authCallback,
  APP_ROUTES.resetPassword,
]);

export function useSharedCloudBootstrap() {
  const router = useRouter();
  const pathname = usePathname();
  const { restoreDraftForSession, clearGameDraft } = useSyncedGameDraft();

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
  const hydrateCachedSnapshot = useStore((state) => state.hydrateCachedSnapshot);
  const clearAuthState = useStore((state) => state.clearAuthState);
  const setPlayers = useStore((state) => state.setPlayers);
  const setGroups = useStore((state) => state.setGroups);
  const setGames = useStore((state) => state.setGames);

  const bootstrapIdRef = useRef(0);
  const sharedRefreshIdRef = useRef(0);
  // Once the cloud snapshot has landed, a later cache read must not clobber it.
  const cloudHydratedRef = useRef(false);
  const sharedCloudChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const sharedCloudChannelUserIdRef = useRef<string | null>(null);

  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.has(pathname);
  const showBlockingOverlay =
    !isPublicAuthRoute &&
    (authBootstrapStatus === "loading" || authBootstrapStatus === "error");
  const sharedCloudUserId = authSession?.user?.id ?? null;

  useEffect(() => startSnapshotCachePersistence(useStore), []);

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
          clearGameDraft();
          await remove("gameDraft");
          await clearCachedSnapshot();
          clearAuthState();
          setPlayers([] as any);
          setGroups([] as any);
          setGames([] as any);
          setStatsSnapshot(null);
          setPasswordRecoveryPending(pendingIntent === "recovery-ready");
          setAuthBootstrapStatus("ready");
          return;
        }

        // Seed from the on-device cache first: reading the session is local and
        // fast, so the shared collections can be usable well before the cloud
        // snapshot arrives. The cloud load below overwrites this.
        const cachedSnapshot = await loadCachedSnapshot(session.user.id);
        if (!active || requestId !== bootstrapIdRef.current) {
          return;
        }

        if (cachedSnapshot && !cloudHydratedRef.current) {
          hydrateCachedSnapshot(cachedSnapshot);
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
        cloudHydratedRef.current = true;
        await restoreDraftForSession(session.user.id);
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
    clearGameDraft,
    hydrateAuthBootstrap,
    hydrateCachedSnapshot,
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
    if (authBootstrapStatus !== "ready" || !sharedCloudUserId || !authProfile?.player_name) {
      return;
    }

    let active = true;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const channelName = `moonrakers-shared-cloud:${sharedCloudUserId}`;
    const channelTopic = `realtime:${channelName}`;
    const refreshSession = {
      user: {
        id: sharedCloudUserId,
        email: null,
      },
    };

    async function refreshSharedSnapshot() {
      const requestId = ++sharedRefreshIdRef.current;

      try {
        const hydratedSnapshot = await loadHydratedSharedSnapshot(refreshSession);
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

      refreshTimer = setTimeout(() => {
        void refreshSharedSnapshot();
      }, 150);
    }

    if (
      sharedCloudChannelRef.current &&
      sharedCloudChannelUserIdRef.current === sharedCloudUserId
    ) {
      return;
    }

    async function attachSharedCloudChannel() {
      const existingChannels = supabase
        .getChannels()
        .filter((existingChannel) => existingChannel.topic === channelTopic);

      for (const existingChannel of existingChannels) {
        if (sharedCloudChannelRef.current === existingChannel) {
          sharedCloudChannelRef.current = null;
          sharedCloudChannelUserIdRef.current = null;
        }

        await supabase.removeChannel(existingChannel);
        if (!active) {
          return;
        }
      }

      channel = supabase
        .channel(channelName)
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

      if (!active) {
        void supabase.removeChannel(channel);
        return;
      }

      sharedCloudChannelRef.current = channel;
      sharedCloudChannelUserIdRef.current = sharedCloudUserId;
    }

    void attachSharedCloudChannel();

    return () => {
      active = false;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
      if (channel && sharedCloudChannelRef.current === channel) {
        sharedCloudChannelRef.current = null;
        sharedCloudChannelUserIdRef.current = null;
      }
      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, [
    authBootstrapStatus,
    authProfile?.player_name,
    hydrateCloudSnapshot,
    sharedCloudUserId,
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
        router.replace(buildHomeRoute() as any);
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
      clearGameDraft();
      await remove("gameDraft");
      await clearCachedSnapshot();
      await clearPendingAuthIntent();
      cloudHydratedRef.current = false;
      setPasswordRecoveryPending(false);
      setAuthSession(null);
      setAuthProfile(null);
      setStatsSnapshot(null);
      setAuthError(null);
      setAuthBootstrapStatus("ready");
      router.replace(APP_ROUTES.login as any);
    }
  }

  return {
    authError,
    authBootstrapStatus,
    showBlockingOverlay,
    handleOverlayEscape,
  };
}
