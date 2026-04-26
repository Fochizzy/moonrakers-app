export type LaunchSession = {
  user: {
    id: string;
    email?: string | null;
  };
} | null;

export type LaunchProfile = {
  id: string;
  player_name?: string | null;
  display_name?: string | null;
  favorite_color?: string | null;
  assigned_card_art_index?: number | null;
} | null;

export type AuthBootstrapStatus = "idle" | "loading" | "ready" | "error";

type LaunchInput = {
  session: LaunchSession;
  profile: LaunchProfile;
  passwordRecoveryPending?: boolean;
};

export function resolveLaunchRoute(input: LaunchInput) {
  if (input.passwordRecoveryPending) {
    return "/reset-password";
  }

  if (!input.session) {
    return "/login";
  }

  if (!input.profile?.player_name) {
    return "/register";
  }

  return "/";
}

type HomeRouteGateInput = LaunchInput & {
  authBootstrapStatus: AuthBootstrapStatus;
};

export function resolveHomeRedirect(input: HomeRouteGateInput): string | null {
  if (input.authBootstrapStatus !== "ready") {
    return null;
  }

  const launchRoute = resolveLaunchRoute(input);
  return launchRoute === "/" ? null : launchRoute;
}
