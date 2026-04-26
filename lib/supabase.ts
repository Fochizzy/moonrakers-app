import { createClient, processLock, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseEnv = {
  url: string;
  publishableKey: string;
};

type SupabaseEnvSource = Record<string, string | undefined>;

type SessionStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

type NativeBindings = {
  AppState: {
    addEventListener: (
      type: "change",
      listener: (state: string) => void,
    ) => unknown;
  };
  AsyncStorage: SessionStorage;
  platformOs: string;
};

function loadExpoExtraSupabaseEnv(): SupabaseEnvSource {
  if (typeof navigator === "undefined" || navigator.product !== "ReactNative") {
    return {};
  }

  try {
    const constantsModule = require("expo-constants") as typeof import("expo-constants");
    const Constants = constantsModule.default;
    const extra = (Constants.expoConfig?.extra ?? {}) as Record<
      string,
      string | null | undefined
    >;

    return {
      EXPO_PUBLIC_SUPABASE_URL:
        typeof extra.EXPO_PUBLIC_SUPABASE_URL === "string"
          ? extra.EXPO_PUBLIC_SUPABASE_URL
          : undefined,
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        typeof extra.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY === "string"
          ? extra.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          : undefined,
    };
  } catch {
    return {};
  }
}

export function readSupabaseEnv(
  source: SupabaseEnvSource = process.env as SupabaseEnvSource,
  fallbackSource: SupabaseEnvSource = loadExpoExtraSupabaseEnv(),
): SupabaseEnv {
  const resolvedSource = {
    ...fallbackSource,
    ...source,
  };

  const url = String(resolvedSource.EXPO_PUBLIC_SUPABASE_URL ?? "").trim();
  const publishableKey = String(
    resolvedSource.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  ).trim();

  if (!url) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_URL");
  }

  if (!publishableKey) {
    throw new Error("Missing EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  }

  return { url, publishableKey };
}

export function formatSupabaseConfigError(error: unknown) {
  let message = "";

  if (error instanceof Error) {
    message = error.message;
  } else if (error && typeof error === "object") {
    const record = error as Record<string, unknown>;
    const objectMessage =
      typeof record.message === "string" ? record.message.trim() : "";
    const details =
      typeof record.details === "string" ? record.details.trim() : "";
    const hint = typeof record.hint === "string" ? record.hint.trim() : "";

    message = [objectMessage, details, hint].filter(Boolean).join(" ");
  } else {
    message = String(error ?? "").trim();
  }

  if (
    message.includes("EXPO_PUBLIC_SUPABASE_URL") ||
    message.includes("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
  ) {
    return "Missing local Supabase config. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY to .env.local, then restart Metro with npx expo start -c.";
  }

  if (
    message.includes("player_name") &&
    (message.includes("column") || message.includes("schema cache"))
  ) {
    return "This Supabase project does not match the Moonrakers schema yet. The app expects public.profiles.player_name, but the connected project is missing that column.";
  }

  return message || "Unable to connect to Supabase.";
}

type RedirectUrlParams = {
  type?: "email" | "recovery";
};

export function buildSupabaseRedirectUrl(
  scheme = "moonrakers",
  params: RedirectUrlParams = {},
) {
  const baseUrl = `${scheme}://auth/callback`;
  const queryParams = new URLSearchParams();

  if (params.type) {
    queryParams.set("type", params.type);
  }

  const query = queryParams.toString();
  return query ? `${baseUrl}?${query}` : baseUrl;
}

function loadNativeBindings(): NativeBindings | null {
  if (typeof navigator === "undefined" || navigator.product !== "ReactNative") {
    return null;
  }

  require("react-native-url-polyfill/auto");
  const { AppState, Platform } = require("react-native") as typeof import("react-native");
  const asyncStorageModule = require("@react-native-async-storage/async-storage") as typeof import("@react-native-async-storage/async-storage");

  return {
    AppState,
    AsyncStorage: asyncStorageModule.default,
    platformOs: Platform.OS,
  };
}

let supabaseClient: SupabaseClient | null = null;
let isNativeAutoRefreshBound = false;

export function createSupabaseClient(
  source: SupabaseEnvSource = process.env as SupabaseEnvSource,
) {
  const env = readSupabaseEnv(source);
  const nativeBindings = loadNativeBindings();

  const client = createClient(env.url, env.publishableKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
      lock: processLock,
      ...(nativeBindings && nativeBindings.platformOs !== "web"
        ? { storage: nativeBindings.AsyncStorage }
        : {}),
    },
  });

  if (
    nativeBindings &&
    nativeBindings.platformOs !== "web" &&
    !isNativeAutoRefreshBound
  ) {
    nativeBindings.AppState.addEventListener("change", (state) => {
      if (state === "active") {
        client.auth.startAutoRefresh();
        return;
      }

      client.auth.stopAutoRefresh();
    });
    isNativeAutoRefreshBound = true;
  }

  return client;
}

export function getSupabaseClient(
  source: SupabaseEnvSource = process.env as SupabaseEnvSource,
) {
  if (source !== (process.env as SupabaseEnvSource)) {
    return createSupabaseClient(source);
  }

  if (!supabaseClient) {
    supabaseClient = createSupabaseClient(source);
  }

  return supabaseClient;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, property) {
    const client = getSupabaseClient();
    const value = Reflect.get(client as object, property);

    return typeof value === "function" ? value.bind(client) : value;
  },
}) as SupabaseClient;
