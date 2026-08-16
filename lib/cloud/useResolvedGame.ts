import { useEffect, useMemo, useState } from "react";

import { loadCloudGameById } from "@/lib/cloud/loadCloudGameById";
import { useGames } from "@/store/useStore";

export type ResolvedGameStatus = "idle" | "ready" | "loading" | "missing";

export type ResolvedGame<T = unknown> = {
  game: T | undefined;
  status: ResolvedGameStatus;
  /** True once the game came from the cloud rather than the local store. */
  fromCloud: boolean;
};

function normalizeId(value: unknown) {
  return String(value ?? "").trim();
}

/**
 * Resolves a saved game by id for the screens that open one.
 *
 * The local store is not persisted, so it holds games only after the shared
 * cloud bootstrap has run. Server-authored links (the profile's recent games)
 * can arrive first, which used to render "Game Not Found" for games that exist.
 * When the store misses, this falls back to fetching the single game.
 */
export function useResolvedGame<T = unknown>(gameId: unknown): ResolvedGame<T> {
  const games = useGames();
  const normalizedGameId = normalizeId(gameId);

  const [cloudGame, setCloudGame] = useState<T | null>(null);
  const [cloudStatus, setCloudStatus] = useState<"idle" | "loading" | "done">(
    "idle",
  );

  const storeGame = useMemo(() => {
    if (!normalizedGameId) return undefined;
    const list = (Array.isArray(games) ? games : []) as Array<{ id?: unknown }>;
    return list.find((entry) => normalizeId(entry?.id) === normalizedGameId);
  }, [games, normalizedGameId]);

  const shouldLoadFromCloud = Boolean(normalizedGameId) && !storeGame;

  useEffect(() => {
    setCloudGame(null);
    setCloudStatus("idle");
  }, [normalizedGameId]);

  useEffect(() => {
    if (!shouldLoadFromCloud || cloudStatus !== "idle") {
      return undefined;
    }

    let cancelled = false;
    setCloudStatus("loading");

    void loadCloudGameById(normalizedGameId)
      .then((game) => {
        if (!cancelled) setCloudGame((game as T) ?? null);
      })
      .catch(() => {
        if (!cancelled) setCloudGame(null);
      })
      .finally(() => {
        if (!cancelled) setCloudStatus("done");
      });

    return () => {
      cancelled = true;
    };
  }, [cloudStatus, normalizedGameId, shouldLoadFromCloud]);

  if (!normalizedGameId) {
    return { game: undefined, status: "idle", fromCloud: false };
  }

  if (storeGame) {
    return { game: storeGame as T, status: "ready", fromCloud: false };
  }

  if (cloudGame) {
    return { game: cloudGame, status: "ready", fromCloud: true };
  }

  return {
    game: undefined,
    status: cloudStatus === "done" ? "missing" : "loading",
    fromCloud: false,
  };
}

export default useResolvedGame;
