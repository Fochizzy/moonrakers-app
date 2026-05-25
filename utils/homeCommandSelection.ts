function normalizeId(value: unknown) {
  return String(value ?? "").trim();
}

export function ensureRequiredPlayerSelection(
  selectedIds: string[],
  requiredPlayerId?: string | null,
  maxPlayers = 5,
) {
  const normalizedRequiredId = normalizeId(requiredPlayerId);
  const limit = Number.isFinite(maxPlayers) ? Math.max(1, Math.floor(maxPlayers)) : 5;
  const deduped = Array.from(
    new Set((Array.isArray(selectedIds) ? selectedIds : []).map((id) => normalizeId(id)).filter(Boolean)),
  );

  if (!normalizedRequiredId) {
    return deduped.slice(0, limit);
  }

  if (deduped.includes(normalizedRequiredId)) {
    return deduped.slice(0, limit);
  }

  return [normalizedRequiredId, ...deduped.slice(0, Math.max(0, limit - 1))];
}

export function filterGroupsForSignedInPlayer<T extends { playerIds?: string[] }>(
  groups: T[],
  signedInPlayerId?: string | null,
) {
  const normalizedSignedInPlayerId = normalizeId(signedInPlayerId);
  if (!normalizedSignedInPlayerId) {
    return [];
  }

  return (Array.isArray(groups) ? groups : []).filter((group) =>
    Array.isArray(group?.playerIds)
      ? group.playerIds.some((playerId) => normalizeId(playerId) === normalizedSignedInPlayerId)
      : false,
  );
}
