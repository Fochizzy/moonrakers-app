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
