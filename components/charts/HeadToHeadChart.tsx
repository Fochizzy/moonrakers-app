import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import Text from '@/components/ui/Text';
import ChartShell from './ChartShell';
import ChartLegend from './ChartLegend';
import { chartColors, withAlpha } from '@/utils/chartTheme';

type Player = { id: string; name: string; color?: string };

type Totals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  objectivePrestige?: number;
  assistPrestigeGiven?: number;
  score?: number;
  assists?: number;
  assistsGiven?: number;
  failures?: number;
  contracts?: number;
};

type Game = {
  id?: string | number;
  createdAt?: number;
  winnerId?: string;
  selectedWinnerId?: string;
  manualWinnerId?: string;
  players?: Array<{ id: string; name?: string }>;
  totals?: Record<string, Totals>;
};

type MatchupRow = {
  key: string;
  playerAId: string;
  playerBId: string;
  playerAName: string;
  playerBName: string;
  playerAColor: string;
  playerBColor: string;
  aWins: number;
  bWins: number;
  total: number;
  aWinRate: number;
  bWinRate: number;
  avgPrestigeMargin: number;
  avgScoreMargin: number;
  recent5AWins: number;
  recent5BWins: number;
  aAssistReceivedPerGame: number;
  bAssistReceivedPerGame: number;
  aAssistGivenPerGame: number;
  bAssistGivenPerGame: number;
  edgeLabel: string;
  momentumLabel: string;
  verdict: string;
};

type Props = {
  players?: Player[];
  games?: Game[];
  maxItems?: number;
  title?: string;
};

type SortMode = 'best_rivalries' | 'most_played' | 'closest' | 'biggest_edge';
type SelectorSlot = 'A' | 'B';

function n(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function safeRatio(numerator: number, denominator: number): number {
  return denominator > 0 ? numerator / denominator : 0;
}

function getWinnerId(game?: Game): string | null {
  return game?.manualWinnerId ?? game?.selectedWinnerId ?? game?.winnerId ?? null;
}

function getPlayerColor(color?: string): string {
  return typeof color === 'string' && color.trim() ? color : chartColors.purple;
}

function getTotalPrestige(totals?: Totals | null): number {
  return (
    n(totals?.totalPrestige) ||
    n(totals?.prestige) ||
    (n(totals?.directPrestige) +
      n(totals?.assistPrestigeReceived) +
      n(totals?.objectivePrestige))
  );
}

function getScore(totals?: Totals | null): number {
  return n(totals?.score);
}

function getAssistReceived(totals?: Totals | null): number {
  return n(totals?.assistPrestigeReceived);
}

function getAssistGiven(totals?: Totals | null): number {
  return (
    n(totals?.assistPrestigeGiven) ||
    n(totals?.assistsGiven) ||
    n(totals?.assists)
  );
}

function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function formatSigned(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`;
}

function getEdgeLabel(aWinRate: number): string {
  const diff = Math.abs(aWinRate - 0.5);
  if (diff < 0.05) return 'Dead heat';
  if (diff < 0.1) return 'Narrow edge';
  if (diff < 0.18) return 'Clear edge';
  return 'Dominant matchup';
}

function getMomentumLabel(recent5AWins: number, recent5BWins: number): string {
  if (recent5AWins === recent5BWins) return 'Even lately';
  if (Math.abs(recent5AWins - recent5BWins) === 1) return 'Slight recent edge';
  return recent5AWins > recent5BWins ? 'A surging' : 'B surging';
}

function buildVerdict(row: MatchupRow): string {
  const longRunLeader = row.aWinRate >= 0.5 ? row.playerAName : row.playerBName;
  if (Math.abs(row.aWinRate - 0.5) < 0.08) {
    return `${row.playerAName} and ${row.playerBName} are effectively even over the larger sample.`;
  }
  return `${longRunLeader} has the stronger long-run edge, with prestige margin ${formatSigned(
    row.avgPrestigeMargin,
  )} and score margin ${formatSigned(row.avgScoreMargin)}.`;
}

function buildRows(players: Player[], games: Game[]): MatchupRow[] {
  const rows: MatchupRow[] = [];

  for (let i = 0; i < players.length; i += 1) {
    for (let j = i + 1; j < players.length; j += 1) {
      const a = players[i];
      const b = players[j];
      let aWins = 0;
      let bWins = 0;
      let prestigeMargin = 0;
      let scoreMargin = 0;
      let aRecv = 0;
      let bRecv = 0;
      let aGiven = 0;
      let bGiven = 0;
      const chronology: Array<{ aWon: boolean; bWon: boolean }> = [];

      for (const game of games) {
        const ids = new Set((game.players ?? []).map((entry) => entry.id));
        if (ids.size && (!ids.has(a.id) || !ids.has(b.id))) continue;

        const aTotals = game.totals?.[a.id];
        const bTotals = game.totals?.[b.id];
        if (!aTotals || !bTotals) continue;

        const winnerId = getWinnerId(game);
        const aWon = winnerId === a.id;
        const bWon = winnerId === b.id;
        if (aWon) aWins += 1;
        if (bWon) bWins += 1;

        prestigeMargin += getTotalPrestige(aTotals) - getTotalPrestige(bTotals);
        scoreMargin += getScore(aTotals) - getScore(bTotals);
        aRecv += getAssistReceived(aTotals);
        bRecv += getAssistReceived(bTotals);
        aGiven += getAssistGiven(aTotals);
        bGiven += getAssistGiven(bTotals);
        chronology.push({ aWon, bWon });
      }

      const total = aWins + bWins;
      if (!total) continue;

      const recent5 = chronology.slice(-5);
      const recent5AWins = recent5.filter((row) => row.aWon).length;
      const recent5BWins = recent5.filter((row) => row.bWon).length;
      const aWinRate = safeRatio(aWins, total);

      const row: MatchupRow = {
        key: `${a.id}-${b.id}`,
        playerAId: a.id,
        playerBId: b.id,
        playerAName: a.name,
        playerBName: b.name,
        playerAColor: getPlayerColor(a.color),
        playerBColor: getPlayerColor(b.color),
        aWins,
        bWins,
        total,
        aWinRate,
        bWinRate: safeRatio(bWins, total),
        avgPrestigeMargin: safeRatio(prestigeMargin, total),
        avgScoreMargin: safeRatio(scoreMargin, total),
        recent5AWins,
        recent5BWins,
        aAssistReceivedPerGame: safeRatio(aRecv, total),
        bAssistReceivedPerGame: safeRatio(bRecv, total),
        aAssistGivenPerGame: safeRatio(aGiven, total),
        bAssistGivenPerGame: safeRatio(bGiven, total),
        edgeLabel: getEdgeLabel(aWinRate),
        momentumLabel: getMomentumLabel(recent5AWins, recent5BWins),
        verdict: '',
      };

      row.verdict = buildVerdict(row);
      rows.push(row);
    }
  }

  return rows;
}

function sortRows(rows: MatchupRow[], sortMode: SortMode, maxItems: number): MatchupRow[] {
  const copy = [...rows];

  switch (sortMode) {
    case 'most_played':
      copy.sort((a, b) => b.total - a.total);
      break;
    case 'closest':
      copy.sort(
        (a, b) =>
          Math.abs(a.aWinRate - 0.5) - Math.abs(b.aWinRate - 0.5) ||
          b.total - a.total,
      );
      break;
    case 'biggest_edge':
      copy.sort(
        (a, b) =>
          Math.abs(b.aWinRate - 0.5) - Math.abs(a.aWinRate - 0.5) ||
          b.total - a.total,
      );
      break;
    case 'best_rivalries':
    default:
      copy.sort(
        (a, b) =>
          b.total -
          Math.abs(b.aWinRate - 0.5) * 10 -
          (a.total - Math.abs(a.aWinRate - 0.5) * 10),
      );
      break;
  }

  return copy.slice(0, maxItems);
}

function findRowForPlayers(
  rows: MatchupRow[],
  playerAId: string | null,
  playerBId: string | null,
): MatchupRow | null {
  if (!playerAId || !playerBId) return null;
  return (
    rows.find(
      (row) =>
        (row.playerAId === playerAId && row.playerBId === playerBId) ||
        (row.playerAId === playerBId && row.playerBId === playerAId),
    ) ?? null
  );
}

function normalizeSelectedIds(
  players: Player[],
  nextA: string | null,
  nextB: string | null,
): { nextA: string | null; nextB: string | null } {
  const ids = new Set(players.map((player) => player.id));
  const safeA = nextA && ids.has(nextA) ? nextA : players[0]?.id ?? null;
  const fallbackB =
    players.find((player) => player.id !== safeA)?.id ?? null;
  const safeB =
    nextB && ids.has(nextB) && nextB !== safeA ? nextB : fallbackB;

  return { nextA: safeA, nextB: safeB };
}

function SelectorChips({
  label,
  slot,
  players,
  selectedId,
  otherSelectedId,
  onSelect,
}: {
  label: string;
  slot: SelectorSlot;
  players: Player[];
  selectedId: string | null;
  otherSelectedId: string | null;
  onSelect: (slot: SelectorSlot, playerId: string) => void;
}) {
  return (
    <View style={styles.selectorBlock}>
      <Text style={styles.selectorLabel}>
        {label}:{' '}
        <Text style={styles.selectorValue}>
          {players.find((player) => player.id === selectedId)?.name ?? 'Choose player'}
        </Text>
      </Text>

      <View style={styles.selectorList}>
        {players.map((player) => {
          const selected = player.id === selectedId;
          const disabled = player.id === otherSelectedId;
          const color = getPlayerColor(player.color);

          return (
            <Pressable
              key={`${slot}-${player.id}`}
              onPress={() => !disabled && onSelect(slot, player.id)}
              disabled={disabled}
              style={[
                styles.playerPill,
                selected && {
                  borderColor: withAlpha(color, 0.8),
                  backgroundColor: withAlpha(color, 0.18),
                },
                disabled && styles.playerPillDisabled,
              ]}
            >
              <View
                style={[
                  styles.playerDot,
                  { backgroundColor: disabled ? withAlpha(color, 0.35) : color },
                ]}
              />
              <Text
                style={[
                  styles.playerPillText,
                  selected && styles.playerPillTextSelected,
                  disabled && styles.playerPillTextDisabled,
                ]}
              >
                {player.name}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function HeadToHeadChart({
  players = [],
  games = [],
  maxItems = 12,
  title = 'Head-to-Head Battles',
}: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('best_rivalries');
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [selectedPlayerAId, setSelectedPlayerAId] = useState<string | null>(null);
  const [selectedPlayerBId, setSelectedPlayerBId] = useState<string | null>(null);

  const allRows = useMemo(() => buildRows(players, games), [players, games]);
  const rows = useMemo(
    () => sortRows(allRows, sortMode, maxItems),
    [allRows, sortMode, maxItems],
  );

  useEffect(() => {
    const normalized = normalizeSelectedIds(players, selectedPlayerAId, selectedPlayerBId);
    if (
      normalized.nextA !== selectedPlayerAId ||
      normalized.nextB !== selectedPlayerBId
    ) {
      setSelectedPlayerAId(normalized.nextA);
      setSelectedPlayerBId(normalized.nextB);
    }
  }, [players, selectedPlayerAId, selectedPlayerBId]);

  const explicitMatchup = useMemo(
    () => findRowForPlayers(allRows, selectedPlayerAId, selectedPlayerBId),
    [allRows, selectedPlayerAId, selectedPlayerBId],
  );

  useEffect(() => {
    if (explicitMatchup) {
      setSelectedKey(explicitMatchup.key);
      return;
    }

    if (!rows.length) {
      setSelectedKey(null);
      setExpandedKey(null);
      return;
    }

    if (!rows.some((row) => row.key === selectedKey)) {
      setSelectedKey(rows[0].key);
    }
  }, [rows, selectedKey, explicitMatchup]);

  const selected =
    explicitMatchup ??
    rows.find((row) => row.key === selectedKey) ??
    rows[0] ??
    null;

  useEffect(() => {
    if (!selected) return;
    setSelectedPlayerAId(selected.playerAId);
    setSelectedPlayerBId(selected.playerBId);
  }, [selected?.key]);

  const accent = selected?.playerAColor ?? chartColors.purple;
  const legend = selected
    ? [
        {
          key: selected.playerAId,
          label: selected.playerAName,
          color: selected.playerAColor,
          value: formatPct(selected.aWinRate),
        },
        {
          key: selected.playerBId,
          label: selected.playerBName,
          color: selected.playerBColor,
          value: formatPct(selected.bWinRate),
        },
      ]
    : [];

  const filteredRows = explicitMatchup ? [explicitMatchup] : rows;
  const noDirectMatchup =
    !!selectedPlayerAId && !!selectedPlayerBId && !explicitMatchup;

  const handleSelectPlayer = (slot: SelectorSlot, playerId: string) => {
    if (slot === 'A') {
      if (playerId === selectedPlayerBId) return;
      setSelectedPlayerAId(playerId);
      return;
    }

    if (playerId === selectedPlayerAId) return;
    setSelectedPlayerBId(playerId);
  };

  if (!allRows.length) {
    return (
      <ChartShell
        title={title}
        subtitle="Pick two players and compare their shared games."
        explanation="Each card only counts games where both selected players appeared."
        meaning="Use this chart to separate close rivalries from one-sided counters."
      >
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Not enough shared matchups yet.</Text>
        </View>
      </ChartShell>
    );
  }

  return (
    <ChartShell
      title={title}
      subtitle="Pick the exact two players you want to compare."
      playerColor={accent}
      badge={selected ? `${selected.total} games` : undefined}
      topStats={
        selected
          ? [
              { label: selected.playerAName, value: formatPct(selected.aWinRate) },
              { label: selected.playerBName, value: formatPct(selected.bWinRate) },
              { label: 'Recent 5', value: `${selected.recent5AWins}-${selected.recent5BWins}` },
              { label: 'Prestige Δ', value: formatSigned(selected.avgPrestigeMargin) },
            ]
          : undefined
      }
      explanation="Use Player A and Player B below to lock the chart to one exact matchup."
      meaning="When a matchup exists, the battle bar shows win share and the cards explain the edge."
      legend={<ChartLegend items={legend} />}
    >
      <View style={styles.selectorCard}>
        <Text style={styles.selectorTitle}>Compare these two players</Text>
        <SelectorChips
          label="Player A"
          slot="A"
          players={players}
          selectedId={selectedPlayerAId}
          otherSelectedId={selectedPlayerBId}
          onSelect={handleSelectPlayer}
        />
        <SelectorChips
          label="Player B"
          slot="B"
          players={players}
          selectedId={selectedPlayerBId}
          otherSelectedId={selectedPlayerAId}
          onSelect={handleSelectPlayer}
        />
      </View>

      {!explicitMatchup ? (
        <View style={styles.sortRow}>
          {([
            ['best_rivalries', 'Best Rivalries'],
            ['most_played', 'Most Played'],
            ['closest', 'Closest'],
            ['biggest_edge', 'Biggest Edge'],
          ] as Array<[SortMode, string]>).map(([key, label]) => {
            const active = key === sortMode;
            return (
              <Pressable
                key={key}
                onPress={() => setSortMode(key)}
                style={[styles.sortPill, active && styles.sortPillActive]}
              >
                <Text style={[styles.sortPillText, active && styles.sortPillTextActive]}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {noDirectMatchup ? (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>No shared matchup found</Text>
          <Text style={styles.noticeText}>
            These two players do not have any games together in the current data, so the list below falls back to the best available rivalries.
          </Text>
        </View>
      ) : null}

      {selected ? (
        <View style={styles.stickySummary}>
          <Text style={styles.summaryTitle}>
            {selected.playerAName} vs {selected.playerBName}
          </Text>
          <Text style={styles.summaryText}>{selected.verdict}</Text>
          <View style={styles.barWrap}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barLeft,
                  {
                    width: `${selected.aWinRate * 50}%`,
                    backgroundColor: selected.playerAColor,
                  },
                ]}
              />
              <View
                style={[
                  styles.barRight,
                  {
                    width: `${selected.bWinRate * 50}%`,
                    backgroundColor: selected.playerBColor,
                  },
                ]}
              />
              <View style={styles.barCenter} />
            </View>
            <View style={styles.barLabels}>
              <Text style={styles.barLabel}>{selected.aWins} wins</Text>
              <Text style={styles.barLabel}>split</Text>
              <Text style={styles.barLabel}>{selected.bWins} wins</Text>
            </View>
          </View>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={styles.cards}>
        {filteredRows.map((row) => {
          const isSelected = row.key === selected?.key;
          const expanded = expandedKey === row.key;

          return (
            <Pressable
              key={row.key}
              onPress={() => setSelectedKey(row.key)}
              style={[
                styles.card,
                isSelected && {
                  borderColor: withAlpha(row.playerAColor, 0.6),
                  backgroundColor: withAlpha(row.playerAColor, 0.08),
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>
                  {row.playerAName} vs {row.playerBName}
                </Text>
                <Text style={styles.cardMeta}>{row.total} games</Text>
              </View>

              <View style={styles.chips}>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{row.edgeLabel}</Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>{row.momentumLabel}</Text>
                </View>
                <View style={styles.chip}>
                  <Text style={styles.chipText}>
                    Recent 5 {row.recent5AWins}-{row.recent5BWins}
                  </Text>
                </View>
              </View>

              <View style={styles.rowStats}>
                <Text style={styles.statText}>
                  Prestige Δ {formatSigned(row.avgPrestigeMargin)}
                </Text>
                <Text style={styles.statText}>
                  Score Δ {formatSigned(row.avgScoreMargin)}
                </Text>
              </View>

              <View style={styles.rowStats}>
                <Text style={styles.statText}>
                  {row.playerAName} {formatPct(row.aWinRate)}
                </Text>
                <Pressable
                  onPress={() => setExpandedKey(expanded ? null : row.key)}
                  style={styles.drawerToggle}
                >
                  <Text style={styles.drawerToggleText}>
                    {expanded ? 'Hide details' : 'Show details'}
                  </Text>
                </Pressable>
              </View>

              {expanded ? (
                <View style={styles.drawer}>
                  <Text style={styles.drawerVerdict}>{row.verdict}</Text>
                  <View style={styles.drawerGrid}>
                    <View style={styles.drawerStat}>
                      <Text style={styles.drawerStatLabel}>A recv / game</Text>
                      <Text style={styles.drawerStatValue}>
                        {row.aAssistReceivedPerGame.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.drawerStat}>
                      <Text style={styles.drawerStatLabel}>B recv / game</Text>
                      <Text style={styles.drawerStatValue}>
                        {row.bAssistReceivedPerGame.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.drawerStat}>
                      <Text style={styles.drawerStatLabel}>A given / game</Text>
                      <Text style={styles.drawerStatValue}>
                        {row.aAssistGivenPerGame.toFixed(2)}
                      </Text>
                    </View>
                    <View style={styles.drawerStat}>
                      <Text style={styles.drawerStatLabel}>B given / game</Text>
                      <Text style={styles.drawerStatValue}>
                        {row.bAssistGivenPerGame.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </ChartShell>
  );
}

const styles = StyleSheet.create({
  selectorCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    marginBottom: 12,
    gap: 12,
  },
  selectorTitle: {
    color: chartColors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  selectorBlock: {
    gap: 8,
  },
  selectorLabel: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '800',
  },
  selectorValue: {
    color: chartColors.text,
  },
  selectorList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  playerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    backgroundColor: withAlpha(chartColors.text, 0.04),
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  playerPillDisabled: {
    opacity: 0.5,
  },
  playerDot: {
    width: 9,
    height: 9,
    borderRadius: 999,
  },
  playerPillText: {
    color: chartColors.subtext,
    fontSize: 12,
    fontWeight: '800',
  },
  playerPillTextSelected: {
    color: chartColors.text,
  },
  playerPillTextDisabled: {
    color: withAlpha(chartColors.subtext, 0.75),
  },
  noticeCard: {
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    backgroundColor: withAlpha(chartColors.text, 0.04),
    borderWidth: 1,
    borderColor: withAlpha(chartColors.text, 0.1),
    gap: 6,
  },
  noticeTitle: {
    color: chartColors.text,
    fontSize: 13,
    fontWeight: '900',
  },
  noticeText: {
    color: chartColors.subtext,
    fontSize: 12,
    lineHeight: 18,
  },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  sortPill: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    backgroundColor: chartColors.panelBg,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sortPillActive: {
    borderColor: chartColors.purple,
    backgroundColor: withAlpha(chartColors.purple, 0.18),
  },
  sortPillText: { color: chartColors.subtext, fontSize: 12, fontWeight: '800' },
  sortPillTextActive: { color: chartColors.text },
  stickySummary: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    marginBottom: 12,
    gap: 10,
  },
  summaryTitle: { color: chartColors.text, fontSize: 16, fontWeight: '900' },
  summaryText: { color: chartColors.subtext, fontSize: 12, lineHeight: 18 },
  barWrap: { gap: 8 },
  barTrack: {
    height: 16,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: withAlpha(chartColors.text, 0.06),
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  barLeft: { alignSelf: 'stretch' },
  barRight: { alignSelf: 'stretch' },
  barCenter: {
    position: 'absolute',
    left: '50%',
    width: 2,
    top: 0,
    bottom: 0,
    backgroundColor: withAlpha(chartColors.text, 0.35),
  },
  barLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  barLabel: { color: chartColors.subtext, fontSize: 11, fontWeight: '700' },
  cards: { gap: 12 },
  card: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
    gap: 10,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  cardTitle: { color: chartColors.text, fontSize: 15, fontWeight: '900', flex: 1 },
  cardMeta: { color: chartColors.subtext, fontSize: 11, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: withAlpha(chartColors.text, 0.05),
    borderWidth: 1,
    borderColor: withAlpha(chartColors.text, 0.08),
  },
  chipText: { color: chartColors.subtext, fontSize: 11, fontWeight: '800' },
  rowStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    alignItems: 'center',
  },
  statText: { color: chartColors.text, fontSize: 12, fontWeight: '700' },
  drawerToggle: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: withAlpha(chartColors.purple, 0.15),
    borderWidth: 1,
    borderColor: withAlpha(chartColors.purple, 0.35),
  },
  drawerToggleText: { color: chartColors.text, fontSize: 11, fontWeight: '800' },
  drawer: {
    borderTopWidth: 1,
    borderTopColor: withAlpha(chartColors.text, 0.08),
    paddingTop: 10,
    gap: 10,
  },
  drawerVerdict: { color: chartColors.subtext, fontSize: 12, lineHeight: 18 },
  drawerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  drawerStat: {
    minWidth: 120,
    flexGrow: 1,
    borderRadius: 12,
    padding: 10,
    backgroundColor: withAlpha(chartColors.text, 0.04),
  },
  drawerStatLabel: {
    color: chartColors.subtext,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  drawerStatValue: { color: chartColors.text, fontSize: 14, fontWeight: '900' },
  emptyCard: {
    borderRadius: 16,
    padding: 18,
    backgroundColor: chartColors.panelBg,
    borderWidth: 1,
    borderColor: chartColors.borderStrong,
  },
  emptyText: { color: chartColors.subtext, fontSize: 13, fontWeight: '700' },
});
