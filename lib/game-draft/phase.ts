import { APP_ROUTES } from "@/utils/appRoutes.ts";

import type { GameDraft, GameDraftPhase } from "./types.ts";

export function resolveDraftResumeRoute(phase: GameDraftPhase) {
  switch (phase) {
    case "setup":
      return APP_ROUTES.gameSetup;
    case "in_progress":
    case "ready_to_finish":
      return APP_ROUTES.game;
    case "player_selection":
    default:
      return APP_ROUTES.home;
  }
}

export function isGameplayDraftPhase(phase: GameDraftPhase) {
  return phase === "in_progress" || phase === "ready_to_finish";
}

export function canResumeDraft(draft: GameDraft | null): draft is GameDraft {
  return Boolean(draft && isGameplayDraftPhase(draft.phase));
}
