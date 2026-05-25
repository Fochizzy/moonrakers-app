type PlayerWithId = {
  id: string;
};

function haveSameIds(
  left: readonly string[],
  right: readonly string[]
): boolean {
  if (left.length !== right.length) return false;

  return left.every((id, index) => String(id) === String(right[index]));
}

export function buildRouteScopeSeedKey(
  chartKey: string,
  routeIds: readonly string[]
): string | null {
  const normalizedIds = routeIds
    .map((id) => String(id).trim())
    .filter(Boolean)
    .sort();

  if (!normalizedIds.length) return null;
  return `${String(chartKey).trim()}:${normalizedIds.join(",")}`;
}

export function getRouteSyncedGroupIds({
  routeIds,
  currentIds,
  players,
}: {
  routeIds: readonly string[];
  currentIds: readonly string[];
  players: readonly PlayerWithId[];
}): string[] | null {
  if (!routeIds.length) return null;

  const validPlayerIds = new Set(players.map((player) => String(player.id)));
  const validRouteIds = routeIds.filter((id) => validPlayerIds.has(String(id)));

  if (!validRouteIds.length) return null;
  if (haveSameIds(validRouteIds, currentIds)) return null;

  return validRouteIds;
}

export function getPreferredScopeIdsForChart({
  chartKey,
  routeIds,
  currentIds,
  players,
}: {
  chartKey: string;
  routeIds: readonly string[];
  currentIds: readonly string[];
  players: readonly PlayerWithId[];
}): string[] | null {
  const validPlayerIds = new Set(players.map((player) => String(player.id)));
  const validRouteIds = routeIds.filter((id) => validPlayerIds.has(String(id)));

  if (chartKey === "relationship_graph" && validRouteIds.length >= 2) {
    return haveSameIds(validRouteIds, currentIds) ? null : validRouteIds;
  }

  if (!validRouteIds.length) return null;
  return haveSameIds(validRouteIds, currentIds) ? null : validRouteIds;
}
