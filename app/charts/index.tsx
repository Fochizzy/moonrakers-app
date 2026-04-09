import React, { useEffect, useMemo, useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useStore } from "@/store/useStore";
import Text from "@/components/ui/Text";

const COLORS = {
  bg: "#081120",
  card: "rgba(12,18,38,0.92)",
  text: "#E2E8F0",
  sub: "#94A3B8",
  muted: "#64748B",
  accent: "#A855F7",
  accentSoft: "rgba(168,85,247,0.18)",
  blue: "#3B82F6",
  blueSoft: "rgba(59,130,246,0.18)",
  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.16)",
  border: "rgba(255,255,255,0.08)",
};

const FAVORITES_KEY = "moonrakers:charts:favorites:v2";

type StorePlayer = {
  id: string;
  name?: string;
  color?: string;
};

type MetricKey =
  | "score"
  | "totalPrestige"
  | "prestige"
  | "directPrestige"
  | "assistPrestigeReceived"
  | "objectivePrestige"
  | "assists"
  | "contracts"
  | "failures"
  | "turns"
  | "efficiency"
  | "assistEfficiency"
  | "directEfficiency"
  | "contractSuccessRate"
  | "netPrestige"
  | "supportBalance";

type ChartKey =
  | "elo"
  | "radar"
  | "sparkline"
  | "head_to_head"
  | "rivalry_graph"
  | "line_chart"
  | "multi_line_chart"
  | "bar_chart"
  | "heatmap"
  | "relationship_graph"
  | "assist_network_overview"
  | "stacked_bar_chart"
  | "replay_chart";

type ChartGroup = "1 Player" | "2 Players" | "Group";

type ChartDef = {
  key: ChartKey;
  title: string;
  sub: string;
  group: ChartGroup;
  tone: "accent" | "blue" | "green";
  supportsMetric?: boolean;
  supportsCompare?: boolean;
  supportsIds?: boolean;
};

const METRICS: MetricKey[] = [
  "score",
  "totalPrestige",
  "prestige",
  "directPrestige",
  "assistPrestigeReceived",
  "objectivePrestige",
  "assists",
  "contracts",
  "failures",
  "turns",
  "efficiency",
  "assistEfficiency",
  "directEfficiency",
  "contractSuccessRate",
  "netPrestige",
  "supportBalance",
];

const CHARTS: ChartDef[] = [
  {
    key: "radar",
    title: "Radar",
    sub: "Single-player profile",
    group: "1 Player",
    tone: "accent",
    supportsCompare: true,
  },
  {
    key: "sparkline",
    title: "Sparkline",
    sub: "Mini trend view",
    group: "1 Player",
    tone: "green",
    supportsMetric: true,
    supportsCompare: true,
  },

  {
    key: "head_to_head",
    title: "Head-to-Head",
    sub: "Direct two-player matchup",
    group: "2 Players",
    tone: "blue",
    supportsCompare: true,
  },
  {
    key: "rivalry_graph",
    title: "Rivalry Graph",
    sub: "Two-player tension",
    group: "2 Players",
    tone: "accent",
    supportsCompare: true,
  },

  {
    key: "elo",
    title: "ELO",
    sub: "Leaderboard and ranking",
    group: "Group",
    tone: "blue",
    supportsIds: true,
  },
  {
    key: "line_chart",
    title: "Line Chart",
    sub: "Metric trend over time",
    group: "Group",
    tone: "green",
    supportsMetric: true,
    supportsIds: true,
  },
  {
    key: "multi_line_chart",
    title: "Multi-Line",
    sub: "Unified player comparison",
    group: "Group",
    tone: "green",
    supportsMetric: true,
    supportsIds: true,
  },
  {
    key: "bar_chart",
    title: "Bar Chart",
    sub: "Player metric comparison",
    group: "Group",
    tone: "blue",
    supportsMetric: true,
    supportsIds: true,
  },
  {
    key: "heatmap",
    title: "Heatmap",
    sub: "Intensity by game",
    group: "Group",
    tone: "accent",
    supportsMetric: true,
    supportsIds: true,
  },
  {
    key: "relationship_graph",
    title: "Relationship Graph",
    sub: "Support network",
    group: "Group",
    tone: "blue",
    supportsIds: true,
  },
  {
    key: "assist_network_overview",
    title: "Assist Network",
    sub: "Assist flow overview",
    group: "Group",
    tone: "green",
    supportsIds: true,
  },
  {
    key: "stacked_bar_chart",
    title: "Stacked Bar",
    sub: "Composition view",
    group: "Group",
    tone: "blue",
    supportsIds: true,
  },
  {
    key: "replay_chart",
    title: "Replay Chart",
    sub: "Replay progression",
    group: "Group",
    tone: "green",
    supportsMetric: true,
    supportsIds: true,
  },
];

function toneStyles(tone: ChartDef["tone"]) {
  switch (tone) {
    case "accent":
      return { bg: COLORS.accentSoft, value: COLORS.accent };
    case "blue":
      return { bg: COLORS.blueSoft, value: COLORS.blue };
    case "green":
      return { bg: COLORS.greenSoft, value: COLORS.green };
  }
}

function titleCase(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function SectionHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <View style={styles.sectionHeaderRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionSub}>{sub}</Text>
    </View>
  );
}

function UnderlineOption({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.underlineTabButton} onPress={onPress} activeOpacity={0.9}>
      <Text style={[styles.underlineTabText, active && styles.underlineTabTextActive]}>
        {label}
      </Text>
      <View style={[styles.underlineTabLine, active && styles.underlineTabLineActive]} />
    </TouchableOpacity>
  );
}

function SelectorRail({
  items,
  activeValue,
  onSelect,
}: {
  items: Array<{ value: string; label: string }>;
  activeValue: string | null | undefined;
  onSelect: (value: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={styles.underlineSelectorRowSingleLine}>
        {items.map((item) => (
          <UnderlineOption
            key={item.value}
            label={item.label}
            active={String(activeValue) === String(item.value)}
            onPress={() => onSelect(item.value)}
          />
        ))}
      </View>
    </ScrollView>
  );
}

function ChartRailCard({
  title,
  sub,
  tone,
  starred,
  active,
  onPress,
  onToggleStar,
}: {
  title: string;
  sub: string;
  tone: ChartDef["tone"];
  starred: boolean;
  active: boolean;
  onPress: () => void;
  onToggleStar: () => void;
}) {
  const toneStyle = toneStyles(tone);

  return (
    <TouchableOpacity
      style={[
        styles.chartCard,
        active && { borderColor: toneStyle.value, backgroundColor: toneStyle.bg },
      ]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      <View style={styles.chartCardTopRow}>
        <View style={[styles.chartToneBar, { backgroundColor: toneStyle.value }]} />
        <TouchableOpacity
          onPress={onToggleStar}
          hitSlop={{ top: 8, left: 8, right: 8, bottom: 8 }}
          style={styles.starButton}
        >
          <Text style={[styles.starText, starred && styles.starTextActive]}>
            {starred ? "★" : "☆"}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.chartTitle, { color: active ? toneStyle.value : COLORS.text }]} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.chartSub} numberOfLines={2}>
        {sub}
      </Text>
    </TouchableOpacity>
  );
}

export default function ChartsIndexScreen() {
  const router = useRouter();
  const players = useStore((s: any) => (Array.isArray(s?.players) ? s.players : [])) as StorePlayer[];

  const sortedPlayers = useMemo<StorePlayer[]>(
    () =>
      [...players].sort((a, b) =>
        String(a?.name || "").localeCompare(String(b?.name || ""))
      ),
    [players]
  );

  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [comparePlayerId, setComparePlayerId] = useState<string | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("totalPrestige");
  const [favoriteKeys, setFavoriteKeys] = useState<ChartKey[]>([]);
  const [selectedChartKey, setSelectedChartKey] = useState<ChartKey>("radar");
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);

  useEffect(() => {
    if (!selectedPlayerId && sortedPlayers.length) {
      setSelectedPlayerId(String(sortedPlayers[0].id));
    }
  }, [selectedPlayerId, sortedPlayers]);

  useEffect(() => {
    if (!comparePlayerId && sortedPlayers.length > 1) {
      const fallback = sortedPlayers.find((p) => String(p.id) !== String(selectedPlayerId));
      if (fallback) setComparePlayerId(String(fallback.id));
    }
  }, [comparePlayerId, sortedPlayers, selectedPlayerId]);

  useEffect(() => {
    setSelectedGroupIds((current) => {
      if (!sortedPlayers.length) return [];
      const valid = current.filter((id) => sortedPlayers.some((p) => String(p.id) === String(id)));
      if (valid.length) return valid;
      return sortedPlayers.slice(0, Math.min(4, sortedPlayers.length)).map((p) => String(p.id));
    });
  }, [sortedPlayers]);

  useEffect(() => {
    if (comparePlayerId && String(comparePlayerId) === String(selectedPlayerId)) {
      const fallback = sortedPlayers.find((p) => String(p.id) !== String(selectedPlayerId));
      setComparePlayerId(fallback ? String(fallback.id) : null);
    }
  }, [selectedPlayerId, comparePlayerId, sortedPlayers]);

  useEffect(() => {
    let mounted = true;
    async function loadFavorites() {
      try {
        const raw = await AsyncStorage.getItem(FAVORITES_KEY);
        if (!mounted || !raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((key) => CHARTS.some((chart) => chart.key === key));
          setFavoriteKeys(valid);
        }
      } catch {}
    }
    loadFavorites();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteKeys)).catch(() => {});
  }, [favoriteKeys]);

  const selectedPlayer = useMemo(
    () =>
      sortedPlayers.find((player) => String(player.id) === String(selectedPlayerId)) ??
      sortedPlayers[0] ??
      null,
    [sortedPlayers, selectedPlayerId]
  );

  const comparePlayer = useMemo(
    () =>
      sortedPlayers.find((player) => String(player.id) === String(comparePlayerId)) ?? null,
    [sortedPlayers, comparePlayerId]
  );

  const selectedChart = useMemo(
    () => CHARTS.find((chart) => chart.key === selectedChartKey) ?? CHARTS[0],
    [selectedChartKey]
  );

  const favoriteCharts = useMemo(
    () => favoriteKeys.map((key) => CHARTS.find((chart) => chart.key === key)).filter(Boolean) as ChartDef[],
    [favoriteKeys]
  );

  const onePlayerCharts = useMemo(() => CHARTS.filter((chart) => chart.group === "1 Player"), []);
  const twoPlayerCharts = useMemo(() => CHARTS.filter((chart) => chart.group === "2 Players"), []);
  const groupCharts = useMemo(() => CHARTS.filter((chart) => chart.group === "Group"), []);

  function toggleFavorite(chartKey: ChartKey) {
    setFavoriteKeys((current) =>
      current.includes(chartKey)
        ? current.filter((key) => key !== chartKey)
        : [...current, chartKey]
    );
  }

  function toggleGroupPlayer(playerId: string) {
    setSelectedGroupIds((current) => {
      if (current.includes(playerId)) {
        if (current.length <= 1) return current;
        return current.filter((id) => id !== playerId);
      }
      return [...current, playerId];
    });
  }

  function openChart(chart: ChartDef) {
    if (chart.key === "elo") {
      const params: Record<string, string> = {};
      if (selectedGroupIds.length) params.ids = selectedGroupIds.join(",");
      router.push({
        pathname: "/elo",
        params,
      } as any);
      return;
    }

    const params: Record<string, string> = {
      chartKey: chart.key,
    };

    if (selectedPlayer?.id) params.playerId = String(selectedPlayer.id);
    if (chart.supportsCompare && comparePlayer?.id) params.compareId = String(comparePlayer.id);
    if (chart.supportsMetric) params.metric = selectedMetric;
    if (chart.supportsIds && selectedGroupIds.length) params.ids = selectedGroupIds.join(",");

    router.push({
      pathname: "/charts/[chartKey]",
      params,
    });
  }

  function renderRail(data: ChartDef[]) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.railContent}
      >
        {data.map((chart) => (
          <ChartRailCard
            key={chart.key}
            title={chart.title}
            sub={chart.sub}
            tone={chart.tone}
            starred={favoriteKeys.includes(chart.key)}
            active={selectedChartKey === chart.key}
            onPress={() => setSelectedChartKey(chart.key)}
            onToggleStar={() => toggleFavorite(chart.key)}
          />
        ))}
      </ScrollView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.stickyWrap}>
        <View style={[styles.sectionCompactSticky, styles.launchStickyCard]}>
          <SectionHeader title="Launch Chart" sub="Top sticky quick launch" />
          <View style={styles.launchStickyRow}>
            <View style={styles.launchStickyCopy}>
              <Text style={styles.launchStickyTitle} numberOfLines={1}>
                {selectedChart.title}
              </Text>
              <Text style={styles.launchStickyMeta} numberOfLines={2}>
                {selectedPlayer?.name || "No player"}
                {selectedChart.supportsCompare ? ` • ${comparePlayer?.name || "No compare"}` : ""}
                {selectedChart.supportsMetric ? ` • ${titleCase(selectedMetric)}` : ""}
                {selectedChart.supportsIds ? ` • ${selectedGroupIds.length} selected` : ""}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.launchStickyButton}
              onPress={() => openChart(selectedChart)}
              activeOpacity={0.92}
            >
              <Text style={styles.launchStickyButtonText}>Open {selectedChart.title}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCompactSticky}>
          <SectionHeader
            title="Player"
            sub={selectedPlayer?.name ? `Focus: ${selectedPlayer.name}` : "Select focus"}
          />
          <SelectorRail
            items={sortedPlayers.map((player) => ({
              value: String(player.id),
              label: player.name || "Unknown",
            }))}
            activeValue={selectedPlayer?.id ? String(selectedPlayer.id) : null}
            onSelect={setSelectedPlayerId}
          />
        </View>

        <View style={styles.sectionCompactSticky}>
          <SectionHeader title="Favorites" sub="Star charts to pin them here" />
          {favoriteCharts.length ? renderRail(favoriteCharts) : <Text style={styles.emptyText}>No favorites yet.</Text>}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionCompact}>
          <SectionHeader title="1 Player" sub="Select a chart" />
          {renderRail(onePlayerCharts)}
        </View>

        <View style={styles.sectionCompact}>
          <SectionHeader title="2 Players" sub="Select a chart" />
          {renderRail(twoPlayerCharts)}
        </View>

        <View style={styles.sectionCompact}>
          <SectionHeader title="Group" sub="Select a chart" />
          {renderRail(groupCharts)}
        </View>

        {selectedChart.supportsCompare ? (
          <View style={styles.sectionCompact}>
            <SectionHeader
              title="Compare Player"
              sub="Used by 2-player and compare-capable charts"
            />
            <SelectorRail
              items={sortedPlayers
                .filter((player) => String(player.id) !== String(selectedPlayer?.id ?? ""))
                .map((player) => ({
                  value: String(player.id),
                  label: player.name || "Unknown",
                }))}
              activeValue={comparePlayer?.id ? String(comparePlayer.id) : null}
              onSelect={setComparePlayerId}
            />
          </View>
        ) : null}

        {selectedChart.supportsMetric ? (
          <View style={styles.sectionCompact}>
            <SectionHeader
              title="Metric"
              sub={`Used by ${selectedChart.title}`}
            />
            <SelectorRail
              items={METRICS.map((metric) => ({
                value: metric,
                label: titleCase(metric),
              }))}
              activeValue={selectedMetric}
              onSelect={(value) => setSelectedMetric(value as MetricKey)}
            />
          </View>
        ) : null}

        {selectedChart.supportsIds ? (
          <View style={styles.sectionCompact}>
            <SectionHeader
              title="Players in Group"
              sub="Tap names to include or remove them"
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.underlineSelectorRowSingleLine}>
                {sortedPlayers.map((player) => {
                  const active = selectedGroupIds.includes(String(player.id));
                  return (
                    <UnderlineOption
                      key={player.id}
                      label={player.name || "Unknown"}
                      active={active}
                      onPress={() => toggleGroupPlayer(String(player.id))}
                    />
                  );
                })}
              </View>
            </ScrollView>
            <Text style={styles.helperText}>
              {selectedGroupIds.length
                ? `${selectedGroupIds.length} player${selectedGroupIds.length === 1 ? "" : "s"} selected`
                : "Select at least one player"}
            </Text>
          </View>
        ) : null}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  stickyWrap: {
    backgroundColor: COLORS.bg,
    paddingTop: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  scroll: {
    flex: 1,
  },
  contentContainer: {
    padding: 8,
    paddingBottom: 18,
  },
  sectionCompactSticky: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  launchStickyCard: {
    paddingVertical: 10,
  },
  launchStickyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  launchStickyCopy: {
    flex: 1,
    minWidth: 0,
  },
  launchStickyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  launchStickyMeta: {
    marginTop: 4,
    color: COLORS.sub,
    fontSize: 11,
    lineHeight: 15,
  },
  launchStickyButton: {
    minWidth: 152,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
    justifyContent: "center",
  },
  launchStickyButtonText: {
    color: COLORS.accent,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  sectionCompact: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    gap: 12,
    marginBottom: 8,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: "800",
    flexShrink: 1,
  },
  sectionSub: {
    color: COLORS.sub,
    fontSize: 10,
    textAlign: "right",
    flexShrink: 1,
  },
  underlineSelectorRowSingleLine: {
    flexDirection: "row",
    gap: 14,
    alignItems: "flex-end",
    paddingRight: 10,
  },
  underlineTabButton: {
    paddingBottom: 2,
  },
  underlineTabText: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "700",
  },
  underlineTabTextActive: {
    color: COLORS.accent,
  },
  underlineTabLine: {
    marginTop: 4,
    height: 2,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  underlineTabLineActive: {
    backgroundColor: COLORS.accent,
  },
  railContent: {
    paddingRight: 8,
    gap: 8,
  },
  chartCard: {
    width: 170,
    minHeight: 104,
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
  },
  chartCardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chartToneBar: {
    width: 26,
    height: 3,
    borderRadius: 999,
  },
  starButton: {
    paddingLeft: 8,
    paddingBottom: 4,
  },
  starText: {
    color: COLORS.sub,
    fontSize: 18,
    lineHeight: 18,
    fontWeight: "800",
  },
  starTextActive: {
    color: COLORS.accent,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  chartSub: {
    color: COLORS.sub,
    fontSize: 11,
    lineHeight: 14,
  },
  emptyText: {
    color: COLORS.sub,
    fontSize: 11,
  },
  helperText: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 8,
  },
  launchCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 10,
    backgroundColor: "rgba(255,255,255,0.03)",
  },
  launchTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "800",
  },
  launchSub: {
    color: COLORS.sub,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  launchMetaWrap: {
    marginTop: 10,
    gap: 4,
  },
  launchMeta: {
    color: COLORS.text,
    fontSize: 11,
  },
  launchButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: COLORS.accentSoft,
    alignItems: "center",
  },
  launchButtonText: {
    color: COLORS.accent,
    fontSize: 12,
    fontWeight: "800",
  },
});

