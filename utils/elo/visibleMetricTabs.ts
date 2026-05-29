export const VISIBLE_ELO_METRIC_TABS = [
  "Leaderboard",
  "Momentum",
  "Skills",
  "Context",
] as const;

export type VisibleEloMetricTab =
  (typeof VISIBLE_ELO_METRIC_TABS)[number];

export type LegacyEloMetricTab = VisibleEloMetricTab | "Projection";

export type LooseEloMetricCard = {
  key?: unknown;
  label?: unknown;
  value?: unknown;
  sub?: unknown;
  tone?: unknown;
  [key: string]: unknown;
};

export type LooseEloSection = {
  title?: unknown;
  cards?: unknown;
  [key: string]: unknown;
};

export type LooseEloInsight = {
  title?: unknown;
  body?: unknown;
  [key: string]: unknown;
};

function normalizeKey(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

function cloneCards(cards: unknown): LooseEloMetricCard[] {
  return Array.isArray(cards)
    ? cards.filter(
        (card): card is LooseEloMetricCard =>
          Boolean(card) && typeof card === "object",
      )
    : [];
}

function mergeUniqueCards(
  primaryCards: unknown,
  secondaryCards: unknown,
): LooseEloMetricCard[] {
  const merged: LooseEloMetricCard[] = [];
  const seen = new Set<string>();

  for (const card of [...cloneCards(primaryCards), ...cloneCards(secondaryCards)]) {
    const labelKey = normalizeKey(card.label);
    const fallbackKey = normalizeKey(card.key);
    const dedupeKey = labelKey || fallbackKey;

    if (dedupeKey && seen.has(dedupeKey)) {
      continue;
    }

    if (dedupeKey) {
      seen.add(dedupeKey);
    }

    merged.push(card);
  }

  return merged;
}

function combineBodies(primaryBody: unknown, secondaryBody: unknown) {
  const primary = String(primaryBody ?? "").trim();
  const secondary = String(secondaryBody ?? "").trim();

  if (!primary) return secondary;
  if (!secondary) return primary;
  if (primary === secondary || primary.includes(secondary)) {
    return primary;
  }
  if (secondary.includes(primary)) {
    return secondary;
  }

  return `${primary} ${secondary}`;
}

function findRecord<T extends Record<string, unknown>>(
  records: Record<string, T> | null | undefined,
  key: string,
): T | null {
  if (!records || typeof records !== "object") {
    return null;
  }

  const exact = records[key];
  if (exact && typeof exact === "object") {
    return exact;
  }

  const normalizedKey = normalizeKey(key);
  for (const [recordKey, value] of Object.entries(records)) {
    if (normalizeKey(recordKey) === normalizedKey && value && typeof value === "object") {
      return value as T;
    }
  }

  return null;
}

export function getVisibleEloMetricTabs(): VisibleEloMetricTab[] {
  return [...VISIBLE_ELO_METRIC_TABS];
}

export function normalizeVisibleEloMetricTab(
  tab?: string | null,
): VisibleEloMetricTab {
  const normalized = normalizeKey(tab);
  if (normalized === "projection") {
    return "Skills";
  }

  return (
    VISIBLE_ELO_METRIC_TABS.find(
      (candidate) => normalizeKey(candidate) === normalized,
    ) ?? "Leaderboard"
  );
}

function matchesVisibleOrLegacyProjection(value: unknown) {
  const normalized = normalizeKey(value);
  return (
    normalized === "projection" ||
    VISIBLE_ELO_METRIC_TABS.some(
      (candidate) => normalizeKey(candidate) === normalized,
    )
  );
}

export function filterVisibleEloViewOptions<
  T extends { key?: unknown; label?: unknown },
>(options: T[] | null | undefined): T[] {
  const filtered: T[] = [];
  const seen = new Set<string>();

  for (const option of Array.isArray(options) ? options : []) {
    if (!matchesVisibleOrLegacyProjection(option?.key)) {
      continue;
    }

    const normalizedTab = normalizeVisibleEloMetricTab(
      String(option?.key ?? ""),
    );
    const dedupeKey = normalizeKey(normalizedTab);
    if (seen.has(dedupeKey)) {
      continue;
    }

    seen.add(dedupeKey);
    filtered.push({
      ...option,
      key: normalizedTab,
      label:
        typeof option?.label === "string" && option.label.trim()
          ? option.label.trim() === "Projection"
            ? "Skills"
            : option.label
          : normalizedTab,
    });
  }

  return filtered;
}

export function resolveVisibleEloSection(
  sections: Record<string, LooseEloSection> | null | undefined,
  requestedTab?: string | null,
): LooseEloSection {
  const normalizedTab = normalizeVisibleEloMetricTab(requestedTab);
  const primary = findRecord(sections, normalizedTab);

  if (normalizedTab !== "Skills") {
    return primary ?? { title: `${normalizedTab} Metrics`, cards: [] };
  }

  const projection = findRecord(sections, "Projection");
  if (!primary && !projection) {
    return { title: "Skills Metrics", cards: [] };
  }

  if (!primary) {
    return {
      ...(projection ?? {}),
      title:
        typeof projection?.title === "string" && projection.title.trim()
          ? projection.title
          : "Skills Metrics",
    };
  }

  return {
    ...primary,
    cards: mergeUniqueCards(primary.cards, projection?.cards),
  };
}

export function resolveVisibleEloInsight(
  insights: Record<string, LooseEloInsight> | null | undefined,
  requestedTab?: string | null,
): LooseEloInsight {
  const normalizedTab = normalizeVisibleEloMetricTab(requestedTab);
  const primary = findRecord(insights, normalizedTab);

  if (normalizedTab !== "Skills") {
    return (
      primary ?? {
        title: `${normalizedTab} Insight`,
        body: "No server-authored insight is available yet.",
      }
    );
  }

  const projection = findRecord(insights, "Projection");
  if (!primary && !projection) {
    return {
      title: "Skills Insight",
      body: "No server-authored insight is available yet.",
    };
  }

  if (!primary) {
    return {
      ...(projection ?? {}),
      title:
        typeof projection?.title === "string" && projection.title.trim()
          ? projection.title
          : "Skills Insight",
    };
  }

  return {
    ...primary,
    body: combineBodies(primary.body, projection?.body),
  };
}
