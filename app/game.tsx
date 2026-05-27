import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Alert,
  Pressable,
  Animated,
  Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppStatusBanner from '@/components/status/AppStatusBanner';
import {
  useActiveGame,
  useClearActiveGame,
  useHydrateCloudSnapshot,
  useAuthSession,
  usePlayers,
  useGroups,
} from '@/store/useStore';
import ScreenBackground from '@/components/ui/ScreenBackground';
import Text from '@/components/ui/Text';
import { useSyncedGameDraft } from '@/lib/game-draft/useSyncedGameDraft';
import {
  buildEditRoundCandidate,
  buildSubmitRoundCandidate,
} from '@/lib/game-session/gameSessionController';
import { useGameSessionController } from '@/lib/game-session/useGameSessionController';
import { getFallbackPlayerColor, resolveStoredPlayerColor } from '@/utils/playerColor';
import {
  getNextTurnIndex,
  buildTotals,
  getLeaderboard,
  getLeadingPlayerIds,
  getTotalPrestigeFromTotals,
  type CurrentTurnStats,
  type PlayerTotals,
} from '@/engine/gameEngine';
import {
  getPlayerAccentColor,
  getPlayerBackgroundColor,
} from '@/utils/turnTheme';
import { loadHydratedCloudState } from '@/lib/cloud/loadHydratedCloudState';
import { APP_ROUTES } from '@/utils/appRoutes';
import {
  glowStyle,
  makePlayerWash,
  mixWithBlack,
  withAlpha,
} from '@/utils/gameScreenTheme';
import { toNumber } from '@/utils/numbers';
import { COLORS } from '@/utils/colors';
import { remove } from '@/utils/storage/storage';

type Player = {
  id: string;
  name: string;
  displayName?: string;
  initials?: string;
  color?: string;
  assignedCardArtIndex?: number | null;
  startOrder?: number;
};

type BinaryChoice = 0 | 1 | null;

type StoredRound = {
  id: string;
  playerId: string;
  prestige: number;
  contracts: number;
  failures: number;
  assistRecipients: Record<string, number>;
  assistPrestigeRecipients: Record<string, number>;
  objectiveCount: number;
  objectivePrestige: number;
  createdAt: number;
  metaType?: 'main' | 'bonusObjective';
  linkedTurnId?: string;
};

const initialCurrentState: CurrentTurnStats = {
  prestige: 0,
  contracts: 0,
  failures: 0,
  assistRecipients: {},
  assistPrestigeRecipients: {},
  objectiveCount: 0,
};

const UI = {
  black: '#05070b',
  panelBlack: '#090c12',
  panelElevated: '#0c1018',
  card: '#101722',
  cardSoft: '#0c121b',
  cardMuted: '#0b1018',
  line: COLORS.border,
  lineStrong: 'rgba(255,255,255,0.14)',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.68)',
  textFaint: 'rgba(255,255,255,0.44)',
  success: COLORS.success,
  failure: COLORS.danger,
  gold: '#facc15',
  silver: '#c0c0c0',
  pressedScale: 0.97,
} as const;


function clampCount(value: unknown): number {
  return Math.max(0, Math.floor(toNumber(value)));
}

function getDisplayRounds(rounds: StoredRound[]) {
  return rounds.filter((round) => round.metaType !== 'bonusObjective');
}

function buildEditStateFromRound(
  round: StoredRound,
  linkedRounds: StoredRound[]
): {
  current: CurrentTurnStats;
  contractChoice: BinaryChoice;
  failureChoice: BinaryChoice;
  bonusObjectiveCounts: Record<string, number>;
} {
  const current: CurrentTurnStats = {
    prestige: toNumber(round?.prestige),
    contracts: Math.min(Math.max(toNumber(round?.contracts), 0), 1),
    failures: Math.min(Math.max(toNumber(round?.failures), 0), 1),
    assistRecipients: { ...(round?.assistRecipients ?? {}) },
    assistPrestigeRecipients: { ...(round?.assistPrestigeRecipients ?? {}) },
    objectiveCount: clampCount(round?.objectiveCount ?? round?.objectivePrestige),
  };

  const bonusObjectiveCounts: Record<string, number> = {};

  for (const linkedRound of linkedRounds) {
    if (!linkedRound?.playerId) continue;
    if (linkedRound.playerId === round.playerId) continue;
    bonusObjectiveCounts[linkedRound.playerId] = clampCount(
      linkedRound.objectiveCount ?? linkedRound.objectivePrestige
    );
  }

  return {
    current,
    contractChoice: current.contracts === 1 ? 1 : 0,
    failureChoice: current.failures === 1 ? 1 : 0,
    bonusObjectiveCounts,
  };
}

function AnimatedLeaderboardPill({
  player,
  rank,
  activePlayerId,
  totals,
}: {
  player: Player;
  rank: number;
  activePlayerId?: string;
  totals: Record<string, any>;
}) {
  const motion = React.useRef(new Animated.Value(0)).current;
  const previousRankRef = React.useRef(rank);

  useEffect(() => {
    const previousRank = previousRankRef.current;
    if (previousRank === rank) return;

    const direction = previousRank > rank ? -1 : 1;
    motion.stopAnimation();
    motion.setValue(direction);

    Animated.spring(motion, {
      toValue: 0,
      tension: 120,
      friction: 12,
      useNativeDriver: true,
    }).start();

    previousRankRef.current = rank;
  }, [rank, motion]);

  const accent = getPlayerAccentColor(resolveStoredPlayerColor(player.color, rank));
  const isActive = player.id === activePlayerId;
  const totalPrestige = getTotalPrestigeFromTotals(totals[player.id] as PlayerTotals) || 0;
  const direct = toNumber(totals[player.id]?.directPrestige);

  return (
    <Animated.View
      style={{
        transform: [
          {
            translateY: motion.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [-10, 0, 10],
            }),
          },
          {
            scale: motion.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [1.03, 1, 0.985],
            }),
          },
        ],
      }}
    >
      <View
        style={[
          styles.playerPill,
          {
            opacity: isActive ? 1 : 0.76,
            borderColor: withAlpha(accent, isActive ? 0.62 : 0.3),
            backgroundColor: UI.card,
          },
          isActive ? glowStyle(withAlpha(accent, 0.95), 0.3, 10, 10) : null,
        ]}
      >
        <View
          style={[
            styles.playerPillRail,
            { backgroundColor: withAlpha(accent, isActive ? 0.92 : 0.62) },
          ]}
        />
        <Text style={styles.playerPillName} numberOfLines={1}>
          {player.name}
        </Text>

        <View style={styles.playerPillMetrics}>
          <View style={styles.metricChip}>
            <Text style={styles.metricChipText}>Pts {totalPrestige}</Text>
          </View>
          <View style={styles.metricChip}>
            <Text style={styles.metricChipText}>Src {direct}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function CompactPlayerStrip({
  players,
  activePlayerId,
  totals,
}: {
  players: Player[];
  activePlayerId?: string;
  totals: Record<string, any>;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.playerStripRow}
    >
      {players.map((player, index) => (
        <AnimatedLeaderboardPill
          key={player.id}
          player={player}
          rank={index}
          activePlayerId={activePlayerId}
          totals={totals}
        />
      ))}
    </ScrollView>
  );
}

function ScaleButton({
  onPress,
  disabled,
  style,
  children,
}: {
  onPress?: () => void;
  disabled?: boolean;
  style?: any;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        style,
        pressed && { transform: [{ scale: UI.pressedScale }] },
        disabled && styles.disabled,
      ]}
    >
      {children}
    </Pressable>
  );
}

function DirectPrestigeSection({
  currentDirectPrestige,
  currentAccent,
  onSetDirectPrestige,
  contractChoice,
  failureChoice,
  onSelectContract,
  onSelectFailure,
  stayAtBaseSelected,
}: {
  currentDirectPrestige: number;
  currentAccent: string;
  onSetDirectPrestige: (next: number) => void;
  contractChoice: BinaryChoice;
  failureChoice: BinaryChoice;
  onSelectContract: (value: 0 | 1) => void;
  onSelectFailure: (value: 0 | 1) => void;
  stayAtBaseSelected: boolean;
}) {
  const successSelected = contractChoice === 1;
  const failureSelected = failureChoice === 1;
  const darkerAccent = mixWithBlack(currentAccent, 0.82);

  const counterTintAlpha =
    currentDirectPrestige <= 0 ? 0.1 : Math.min(0.1 + currentDirectPrestige * 0.025, 0.22);

  return (
    <View
      style={[
        styles.sectionCard,
        {
          borderColor: withAlpha(currentAccent, 0.42),
          backgroundColor: mixWithBlack(currentAccent, 0.82),
        },
        glowStyle(withAlpha(currentAccent, 0.95), 0.22, 10, 8),
      ]}
    >
      <View
        style={[
          styles.directPrestigeFrame,
          stayAtBaseSelected && styles.directPrestigeFrameMinimized,
          {
            backgroundColor: stayAtBaseSelected
              ? withAlpha(UI.gold, 0.05)
              : withAlpha(currentAccent, 0.12),
            borderColor: stayAtBaseSelected
              ? withAlpha(UI.gold, 0.5)
              : withAlpha(currentAccent, 0.5),
          },
          stayAtBaseSelected
            ? glowStyle(withAlpha(UI.gold, 0.92), 0.16, 8, 6)
            : glowStyle(withAlpha(currentAccent, 0.95), 0.18, 8, 6),
        ]}
      >
        <Text style={styles.sectionTitle}>Direct Prestige</Text>

        {stayAtBaseSelected ? (
          <View style={styles.baseModeBoxElite}>
            <Text style={styles.baseModeTextElite}>BASE</Text>
          </View>
        ) : (
          <>
            <View style={styles.prestigeCounterRow}>
              <ScaleButton
                onPress={() => onSetDirectPrestige(currentDirectPrestige - 1)}
                style={[
                  styles.prestigeStepperButton,
                  { borderColor: withAlpha(currentAccent, 0.28), backgroundColor: darkerAccent },
                ]}
              >
                <Text style={styles.prestigeStepperText}>-</Text>
              </ScaleButton>

              <View style={styles.prestigeCenterWrap}>
                <View
                  style={[
                    styles.prestigeValueBox,
                    {
                      backgroundColor: withAlpha(currentAccent, counterTintAlpha),
                      borderColor: withAlpha(currentAccent, 0.5),
                    },
                  ]}
                >
                  <Text style={styles.prestigeValueText}>{currentDirectPrestige}</Text>
                </View>
              </View>

              <ScaleButton
                onPress={() => onSetDirectPrestige(currentDirectPrestige + 1)}
                style={[
                  styles.prestigeStepperButton,
                  { borderColor: withAlpha(currentAccent, 0.28), backgroundColor: darkerAccent },
                ]}
              >
                <Text style={styles.prestigeStepperText}>+</Text>
              </ScaleButton>
            </View>

            <View style={styles.contractRow}>
              <ScaleButton
                onPress={() => onSelectContract(successSelected ? 0 : 1)}
                style={[
                  styles.contractButton,
                  successSelected
                    ? styles.contractButtonExpanded
                    : failureSelected
                    ? styles.contractButtonMinimized
                    : styles.contractButtonExpanded,
                  {
                    borderColor: successSelected ? withAlpha(UI.success, 0.46) : UI.lineStrong,
                    backgroundColor: successSelected ? withAlpha(UI.success, 0.08) : UI.cardMuted,
                  },
                ]}
              >
                <Text style={[styles.contractIcon, { color: UI.success }]}>✓</Text>
                {!failureSelected ? <Text style={styles.contractLabel}>Contract Succeeded</Text> : null}
              </ScaleButton>

              <ScaleButton
                onPress={() => onSelectFailure(failureSelected ? 0 : 1)}
                style={[
                  styles.contractButton,
                  failureSelected
                    ? styles.contractButtonExpanded
                    : successSelected
                    ? styles.contractButtonMinimized
                    : styles.contractButtonExpanded,
                  {
                    borderColor: failureSelected ? withAlpha(UI.failure, 0.46) : UI.lineStrong,
                    backgroundColor: failureSelected ? withAlpha(UI.failure, 0.08) : UI.cardMuted,
                  },
                ]}
              >
                <Text style={[styles.contractIcon, { color: UI.failure }]}>✕</Text>
                {!successSelected ? <Text style={styles.contractLabel}>Contract Failed</Text> : null}
              </ScaleButton>
            </View>
          </>
        )}
      </View>
    </View>
  );
}

function AssistAnimatedRow({
  collapsing,
  children,
}: {
  collapsing: boolean;
  children: React.ReactNode;
}) {
  const progress = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    Animated.timing(progress, {
      toValue: collapsing ? 0 : 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [collapsing, progress]);

  const animatedHeight = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 56],
  });

  const animatedMarginBottom = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 5],
  });

  return (
    <Animated.View
      style={{
        height: animatedHeight,
        opacity: progress,
        marginBottom: animatedMarginBottom,
        overflow: 'hidden',
        transform: [
          {
            scaleY: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0.92, 1],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

function AssistSection({
  currentAccent,
  otherPlayers,
  currentAssistRecipients,
  currentAssistPrestigeRecipients,
  onToggleAssist,
  onSetAssistPrestige,
  collapsed,
  onToggleCollapsed,
  onSelectNone,
  collapsedByPlayer,
  setCollapsedAssistPlayers,
  hiddenAssistPlayers,
  onRestoreHiddenPlayer,
  collapsingAssistPlayers,
  onHideAssistAnimated,
}: {
  currentAccent: string;
  otherPlayers: Player[];
  currentAssistRecipients: Record<string, number>;
  currentAssistPrestigeRecipients: Record<string, number>;
  onToggleAssist: (playerId: string, next: 0 | 1) => void;
  onSetAssistPrestige: (playerId: string, value: number) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectNone: () => void;
  collapsedByPlayer: Record<string, boolean>;
  setCollapsedAssistPlayers: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  hiddenAssistPlayers: Record<string, boolean>;
  onRestoreHiddenPlayer: (playerId: string) => void;
  collapsingAssistPlayers: Record<string, boolean>;
  onHideAssistAnimated: (playerId: string) => void;
}) {
  const visiblePlayers = otherPlayers.filter((player) => !hiddenAssistPlayers[player.id]);
  const hiddenPlayers = otherPlayers.filter((player) => hiddenAssistPlayers[player.id]);

  return (
    <View
      style={[
        styles.sectionCard,
        { borderColor: withAlpha(currentAccent, 0.28), backgroundColor: UI.card },
        glowStyle(withAlpha(currentAccent, 0.95), 0.22, 10, 8),
      ]}
    >
      <View style={styles.sectionHeaderRow}>
  <ScaleButton onPress={onToggleCollapsed} style={styles.headerTapZone}>
    <View style={styles.assistHeaderTitleRow}>
      <Text style={styles.sectionTitle}>Assists</Text>
      <Text style={styles.chevron}>{collapsed ? '▾' : '▴'}</Text>
    </View>
  </ScaleButton>

  <View style={styles.assistHeaderRight}>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.assistDotsScroll}
      contentContainerStyle={styles.assistHeaderActions}
    >
      {hiddenPlayers.map((player, index) => {
        const accent = getPlayerAccentColor(resolveStoredPlayerColor(player.color, index));
        return (
          <ScaleButton
            key={player.id}
            onPress={() => onRestoreHiddenPlayer(player.id)}
            style={[
              styles.headerRestoreDotButton,
              {
                borderColor: withAlpha(accent, 0.42),
                backgroundColor: withAlpha(accent, 0.12),
              },
            ]}
          >
            <View
              style={[
                styles.headerRestoreDotOnly,
                { backgroundColor: withAlpha(accent, 0.92) },
              ]}
            />
          </ScaleButton>
        );
      })}
    </ScrollView>

    <ScaleButton onPress={onSelectNone} style={styles.noneChip}>
      <Text style={styles.noneChipText}>None</Text>
    </ScaleButton>
  </View>
</View>

      {!collapsed ? (
        <View style={styles.rowsStack}>
          {visiblePlayers.map((player, index) => {
            const accent = getPlayerAccentColor(resolveStoredPlayerColor(player.color, index));
            const assistOn = toNumber(currentAssistRecipients[player.id]) > 0;
            const rowCollapsed = !!collapsedByPlayer[player.id];
            const rowIsCollapsing = !!collapsingAssistPlayers[player.id];

            return (
              <AssistAnimatedRow key={player.id} collapsing={rowIsCollapsing}>
                <View
                  style={[
                    styles.playerRowCard,
                    {
                      backgroundColor: assistOn ? withAlpha(accent, 0.08) : UI.cardSoft,
                      borderColor: assistOn ? withAlpha(accent, 0.45) : withAlpha(accent, 0.2),
                    },
                    glowStyle(
                      withAlpha(accent, 0.9),
                      assistOn ? 0.2 : 0.12,
                      assistOn ? 10 : 7,
                      assistOn ? 7 : 4
                    ),
                  ]}
                >
                  <View style={styles.assistSingleLine}>
                    <ScaleButton
                      onPress={() =>
                        setCollapsedAssistPlayers((prev) => ({
                          ...prev,
                          [player.id]: !rowCollapsed,
                        }))
                      }
                      style={[
                        styles.assistNameWrap,
                        {
                          backgroundColor: withAlpha(accent, 0.1),
                          borderColor: withAlpha(accent, 0.22),
                        },
                      ]}
                    >
                      <View style={[styles.colorBullet, { backgroundColor: accent }]} />
                      <Text style={styles.playerRowTitle}>{player.name}</Text>
                      <Text style={styles.chevron}>{rowCollapsed ? '▾' : '▴'}</Text>
                    </ScaleButton>

                    {!rowCollapsed ? (
                      <View style={styles.assistInlineControls}>
                        <ScaleButton
                          onPress={() => onHideAssistAnimated(player.id)}
                          style={[styles.choiceChip, styles.choiceChipQuiet]}
                        >
                          <Text style={styles.choiceChipText}>No</Text>
                        </ScaleButton>

                        <ScaleButton
                          onPress={() => onToggleAssist(player.id, 1)}
                          style={[
                            styles.choiceChip,
                            {
                              borderColor: assistOn ? withAlpha(accent, 0.42) : UI.lineStrong,
                              backgroundColor: assistOn ? withAlpha(accent, 0.1) : UI.cardMuted,
                            },
                          ]}
                        >
                          <Text style={styles.choiceChipText}>Yes</Text>
                        </ScaleButton>

                        <View style={[styles.assistInlinePrestige, !assistOn && styles.disabled]}>
                          <ScaleButton
                            disabled={!assistOn}
                            onPress={() =>
                              onSetAssistPrestige(
                                player.id,
                                toNumber(currentAssistPrestigeRecipients[player.id]) - 1
                              )
                            }
                            style={styles.miniStepper}
                          >
                            <Text style={styles.miniStepperText}>-</Text>
                          </ScaleButton>

                          <Text style={styles.miniValue}>
                            {toNumber(currentAssistPrestigeRecipients[player.id])}
                          </Text>

                          <ScaleButton
                            disabled={!assistOn}
                            onPress={() =>
                              onSetAssistPrestige(
                                player.id,
                                toNumber(currentAssistPrestigeRecipients[player.id]) + 1
                              )
                            }
                            style={styles.miniStepper}
                          >
                            <Text style={styles.miniStepperText}>+</Text>
                          </ScaleButton>
                        </View>
                      </View>
                    ) : null}
                  </View>
                </View>
              </AssistAnimatedRow>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function ObjectiveRow({
  title,
  value,
  accent,
  onChange,
}: {
  title: string;
  value: number;
  accent: string;
  onChange: (next: number) => void;
}) {
  return (
    <View
      style={[
        styles.objectiveRowCard,
        {
          backgroundColor: value > 0 ? withAlpha(accent, 0.1) : UI.cardSoft,
          borderColor: value > 0 ? withAlpha(accent, 0.45) : withAlpha(accent, 0.2),
        },
        glowStyle(withAlpha(accent, 0.9), value > 0 ? 0.2 : 0.12, value > 0 ? 10 : 7, value > 0 ? 7 : 4),
      ]}
    >
      <View
        style={[
          styles.objectiveNameWrap,
          {
            backgroundColor: withAlpha(accent, 0.1),
            borderColor: withAlpha(accent, 0.22),
          },
        ]}
      >
        <Text style={styles.objectiveName}>{title}</Text>
      </View>
      <View style={styles.objectiveControlsRight}>
        <ScaleButton onPress={() => onChange(Math.max(0, value - 1))} style={styles.objectiveMiniButton}>
          <Text style={styles.objectiveMiniButtonText}>-</Text>
        </ScaleButton>
        <View style={styles.objectiveValuePill}>
          <Text style={styles.objectiveValueText}>{value}</Text>
        </View>
        <ScaleButton onPress={() => onChange(value + 1)} style={styles.objectiveMiniButton}>
          <Text style={styles.objectiveMiniButtonText}>+</Text>
        </ScaleButton>
      </View>
    </View>
  );
}

function ObjectivesSection({
  currentAccent,
  currentPlayerId,
  currentObjectiveCount,
  onSetCurrentObjectiveCount,
  playersInTurnOrder,
  objectiveAwardsByPlayer,
  onSetOtherPlayerObjective,
  collapsed,
  onToggleCollapsed,
  onSelectNone,
}: {
  currentAccent: string;
  currentPlayerId: string;
  currentObjectiveCount: number;
  onSetCurrentObjectiveCount: (next: number) => void;
  playersInTurnOrder: Player[];
  objectiveAwardsByPlayer: Record<string, number>;
  onSetOtherPlayerObjective: (playerId: string, next: number) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectNone: () => void;
}) {
  const totalAwarded = playersInTurnOrder.reduce((sum, player) => {
    const count =
      player.id === currentPlayerId
        ? clampCount(currentObjectiveCount)
        : clampCount(objectiveAwardsByPlayer[player.id]);
    return sum + count;
  }, 0);

  return (
    <View style={[styles.sectionCard, { borderColor: withAlpha(currentAccent, 0.28), backgroundColor: UI.card }, glowStyle(withAlpha(currentAccent, 0.95), 0.22, 10, 8)]}>
      <View style={styles.sectionHeaderRow}>
        <ScaleButton onPress={onToggleCollapsed} style={styles.headerTapZone}>
          <Text style={styles.sectionTitle}>Objectives {totalAwarded} awarded</Text>
        </ScaleButton>
        <View style={styles.headerActions}>
          <Text style={styles.chevron}>{collapsed ? '▾' : '▴'}</Text>
          <ScaleButton onPress={onSelectNone} style={styles.noneChip}>
            <Text style={styles.noneChipText}>None</Text>
          </ScaleButton>
        </View>
      </View>

      {!collapsed ? (
        <View style={styles.rowsStack}>
          {playersInTurnOrder.map((player, index) => (
            <ObjectiveRow
              key={player.id}
              title={player.name}
              value={
                player.id === currentPlayerId
                  ? clampCount(currentObjectiveCount)
                  : clampCount(objectiveAwardsByPlayer[player.id])
              }
              accent={
                player.id === currentPlayerId
                  ? currentAccent
                  : getPlayerAccentColor(resolveStoredPlayerColor(player.color, index))
              }
              onChange={
                player.id === currentPlayerId
                  ? onSetCurrentObjectiveCount
                  : (next) => onSetOtherPlayerObjective(player.id, next)
              }
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ActionsSection({
  bottomInset,
  editingRoundId,
  canSubmitTurn,
  canEditPreviousTurn,
  showPreviousRounds,
  stayAtBaseSelected,
  onStayAtBase,
  onEditPreviousTurn,
  onSaveOrAdvance,
  onFinishGame,
}: {
  bottomInset: number;
  editingRoundId: string | null;
  canSubmitTurn: boolean;
  canEditPreviousTurn: boolean;
  showPreviousRounds: boolean;
  stayAtBaseSelected: boolean;
  onStayAtBase: () => void;
  onEditPreviousTurn: () => void;
  onSaveOrAdvance: () => void;
  onFinishGame: () => void;
}) {
  return (
    <View
      style={[
        styles.actionsWrap,
        { paddingBottom: Math.max(bottomInset, 16) + 16 },
      ]}
    >
      <View style={styles.actionRow}>
        <ScaleButton
          disabled={!canEditPreviousTurn}
          onPress={onEditPreviousTurn}
          style={[styles.actionButton, styles.actionButtonCompact, styles.secondaryAction]}
        >
          <Text style={styles.actionText}>
            {showPreviousRounds ? 'Hide Previous Turn' : 'Edit Previous Turn'}
          </Text>
        </ScaleButton>

        <ScaleButton
          onPress={onStayAtBase}
          style={[
            styles.actionButton,
            styles.actionButtonCompact,
            stayAtBaseSelected ? styles.baseActionActive : styles.baseAction,
          ]}
        >
          <Text style={[styles.actionText, stayAtBaseSelected && styles.baseActionText]}>
            {stayAtBaseSelected ? 'Undo Base' : 'Stay at Base'}
          </Text>
        </ScaleButton>
      </View>

      <View style={styles.actionRow}>
        <ScaleButton
          disabled={!canSubmitTurn}
          onPress={onSaveOrAdvance}
          style={[styles.actionButton, styles.actionButtonTall, styles.endTurnAction]}
        >
          <Text style={styles.actionText}>{editingRoundId ? 'Save Turn' : 'End Turn'}</Text>
        </ScaleButton>

        <ScaleButton
          onPress={onFinishGame}
          style={[styles.actionButton, styles.actionButtonTall, styles.finishAction]}
        >
          <Text style={styles.actionText}>Finish Game</Text>
        </ScaleButton>
      </View>
    </View>
  );
}

function PreviousRoundsSection({
  displayRounds,
  allRounds,
  players,
  onEditPreviousRound,
}: {
  displayRounds: StoredRound[];
  allRounds: StoredRound[];
  players: Player[];
  onEditPreviousRound: (round: StoredRound) => void;
}) {
  if (!displayRounds.length) return null;

  return (
    <View style={[styles.sectionCard, { backgroundColor: UI.card, borderColor: UI.lineStrong }]}>
      <Text style={styles.sectionTitle}>Previous Rounds</Text>
      <View style={styles.rowsStack}>
        {displayRounds.map((round, index) => {
          const player = players.find((p) => p.id === round.playerId);
          const accent = getPlayerAccentColor(resolveStoredPlayerColor(player?.color, index));
          const linked = allRounds.filter((candidate) => candidate.linkedTurnId === round.id);
          const objectivePrestige =
            clampCount(round.objectiveCount ?? round.objectivePrestige) +
            linked.reduce(
              (sum, candidate) =>
                sum + clampCount(candidate.objectiveCount ?? candidate.objectivePrestige),
              0
            );

          return (
            <ScaleButton
              key={round.id}
              onPress={() => onEditPreviousRound(round)}
              style={[
                styles.previousRoundRow,
                { borderColor: withAlpha(accent, 0.24), backgroundColor: UI.cardSoft },
              ]}
            >
              <Text style={styles.previousRoundText}>R{index + 1} {player?.name ?? 'Unknown'}</Text>
              <Text style={styles.previousRoundMetric}>{toNumber(round.prestige)} direct</Text>
              <Text style={styles.previousRoundMetric}>+{objectivePrestige} obj</Text>
            </ScaleButton>
          );
        })}
      </View>
    </View>
  );
}

export default function Game() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const activeGame = useActiveGame();
  const clearActiveGame = useClearActiveGame();
  const hydrateCloudSnapshot = useHydrateCloudSnapshot();
  const authSession = useAuthSession();
  const playerDirectory = usePlayers() ?? [];
  const groupDirectory = useGroups() ?? [];
  const {
    gameDraft,
    updateGameplay,
    hydrateGameDraft,
    deleteUserGameDraft,
    clearGameDraft,
  } = useSyncedGameDraft();

  const [contractChoice, setContractChoice] = useState<BinaryChoice>(0);
  const [failureChoice, setFailureChoice] = useState<BinaryChoice>(0);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [objectiveAwardsByPlayer, setObjectiveAwardsByPlayer] = useState<Record<string, number>>({});
  const [stayAtBaseSelected, setStayAtBaseSelected] = useState(false);
  const [assistsCollapsed, setAssistsCollapsed] = useState(false);
  const [objectivesCollapsed, setObjectivesCollapsed] = useState(false);
  const [showPreviousRounds, setShowPreviousRounds] = useState(false);
  const [collapsedAssistPlayers, setCollapsedAssistPlayers] = useState<Record<string, boolean>>({});
  const [hiddenAssistPlayers, setHiddenAssistPlayers] = useState<Record<string, boolean>>({});
  const [collapsingAssistPlayers, setCollapsingAssistPlayers] = useState<Record<string, boolean>>({});

  const scrollViewRef = useRef<ScrollView>(null);
  const preBaseSnapshotRef = useRef<{
    current: CurrentTurnStats;
    contractChoice: BinaryChoice;
    failureChoice: BinaryChoice;
    assistsCollapsed: boolean;
    collapsedAssistPlayers: Record<string, boolean>;
    hiddenAssistPlayers: Record<string, boolean>;
  } | null>(null);

  const players = useMemo<Player[]>(
    () =>
      Array.isArray(activeGame?.players)
        ? activeGame.players.map((player: Player, index: number) => ({
            ...player,
            color: resolveStoredPlayerColor(player.color, index),
          }))
        : [],
    [activeGame?.players]
  );

  const activeTurnPlayer = players[activeGame?.turnIndex ?? 0] as Player | undefined;
  const rounds = (activeGame?.rounds ?? []) as StoredRound[];
  const current = (activeGame?.current ?? initialCurrentState) as CurrentTurnStats;
  const displayRounds = useMemo(() => getDisplayRounds(rounds), [rounds]);

  useEffect(() => {
    if (
      !activeGame &&
      gameDraft &&
      (gameDraft.phase === 'in_progress' || gameDraft.phase === 'ready_to_finish')
    ) {
      hydrateGameDraft({ draft: gameDraft });
    }
  }, [activeGame, gameDraft, hydrateGameDraft]);

  const editingRound = useMemo(
    () => rounds.find((round) => round.id === editingRoundId) ?? null,
    [rounds, editingRoundId]
  );

  const currentPlayer = editingRound
    ? players.find((player) => player.id === editingRound.playerId)
    : activeTurnPlayer;

  const otherPlayers = useMemo(
    () => players.filter((player) => player.id !== currentPlayer?.id),
    [players, currentPlayer?.id]
  );

  const totals = useMemo(() => buildTotals(rounds as any, players as any), [rounds, players]);

  const leaderboardPlayers = useMemo(
    () => getLeaderboard(totals as any, players as any, rounds as any).map((entry) => entry.player as Player),
    [totals, players, rounds]
  );
  const finishWinnerId = useMemo(
    () => getLeaderboard(totals as any, players as any)[0]?.id ?? null,
    [totals, players],
  );
  const {
    currentStatus,
    clearCurrentStatus,
    commitFinishGame,
  } = useGameSessionController({
    activeGame: activeGame as Record<string, unknown> | null,
    players: players as Array<Record<string, unknown>>,
    rounds,
    winnerId: finishWinnerId,
    authSession,
    playerDirectory: playerDirectory as Array<Record<string, unknown>>,
    groupDirectory: groupDirectory as Array<Record<string, unknown>>,
    clearActiveGame,
    onDraftFinished: async () => {
      if (!gameDraft?.profileId) {
        return;
      }

      await deleteUserGameDraft(gameDraft.profileId);
      clearGameDraft();
      await remove('gameDraft');
    },
    hydrateCloudSnapshot,
    router,
  });

  const currentAccent = getPlayerAccentColor(
    currentPlayer?.color ?? getFallbackPlayerColor(0)
  );
  const currentDark = mixWithBlack(currentAccent, 0.8);
  const currentDarker = mixWithBlack(currentAccent, 0.88);
  const appBackground = getPlayerBackgroundColor(currentPlayer?.color ?? getFallbackPlayerColor(0));
  const hasOutcomeSelection = current.contracts === 1 || current.failures === 1;

  const canSubmitTurn = useMemo(() => {
    if (!activeGame || !currentPlayer) return false;
    if (players.length < 2) return false;
    if (!stayAtBaseSelected && !hasOutcomeSelection) return false;
    if (current.contracts === 1 && current.failures === 1) return false;
    return true;
  }, [
    activeGame,
    currentPlayer,
    players.length,
    stayAtBaseSelected,
    hasOutcomeSelection,
    current.contracts,
    current.failures,
  ]);

  const latestDisplayRound = useMemo(() => {
    if (!displayRounds.length) return null;
    return displayRounds[displayRounds.length - 1];
  }, [displayRounds]);

  const editingDisplayRoundNumber = useMemo(() => {
    if (!editingRoundId) return null;
    const index = displayRounds.findIndex((round) => round.id === editingRoundId);
    return index >= 0 ? index + 1 : null;
  }, [displayRounds, editingRoundId]);

  if (!activeGame?.players?.length || !activeTurnPlayer || !currentPlayer) {
    return (
      <View style={[styles.screen, { backgroundColor: UI.black }]}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No active game</Text>
        </View>
      </View>
    );
  }

  function commitGameplayPatch(
    patch: Partial<{
      current: Partial<CurrentTurnStats>;
      rounds: StoredRound[];
      totals: Record<string, unknown>;
      turnIndex: number;
      roundCount: number;
      selectedWinnerId: string | null;
    }>,
    phase: 'in_progress' | 'ready_to_finish' = 'in_progress',
  ) {
    if (!activeGame) {
      return;
    }

    void updateGameplay(
      {
        turnIndex: patch.turnIndex ?? activeGame.turnIndex,
        rounds: patch.rounds ?? rounds,
        totals: (patch.totals ?? totals) as any,
        current: {
          ...current,
          ...(patch.current ?? {}),
        },
        roundCount: patch.roundCount ?? activeGame.roundCount,
        selectedWinnerId:
          patch.selectedWinnerId ?? activeGame.selectedWinnerId ?? null,
      },
      phase,
    );
  }

  function updateCurrent(patch: Partial<CurrentTurnStats>) {
    commitGameplayPatch({ current: patch });
  }

  function applyContractChoice(next: 0 | 1) {
    preBaseSnapshotRef.current = null;
    setStayAtBaseSelected(false);
    setContractChoice(next);

    if (next === 1) {
      setFailureChoice(0);
      updateCurrent({ contracts: 1, failures: 0 });
      return;
    }

    updateCurrent({ contracts: 0 });
  }

  function applyFailureChoice(next: 0 | 1) {
    preBaseSnapshotRef.current = null;
    setStayAtBaseSelected(false);
    setFailureChoice(next);

    if (next === 1) {
      setContractChoice(0);
      updateCurrent({ failures: 1, contracts: 0 });
      return;
    }

    updateCurrent({ failures: 0 });
  }

  function toggleAssist(playerId: string, next: 0 | 1) {
    const assistRecipients = { ...(current.assistRecipients ?? {}) };
    const assistPrestigeRecipients = { ...(current.assistPrestigeRecipients ?? {}) };

    assistRecipients[playerId] = next;

    if (next === 1) {
      assistPrestigeRecipients[playerId] = toNumber(assistPrestigeRecipients[playerId]);

      setHiddenAssistPlayers((prev) => ({
        ...prev,
        [playerId]: false,
      }));

      setCollapsedAssistPlayers((prev) => ({
        ...prev,
        [playerId]: false,
      }));
    } else {
      assistPrestigeRecipients[playerId] = 0;

      setHiddenAssistPlayers((prev) => ({
        ...prev,
        [playerId]: true,
      }));

      setCollapsedAssistPlayers((prev) => ({
        ...prev,
        [playerId]: true,
      }));
    }

    updateCurrent({ assistRecipients, assistPrestigeRecipients });
  }

  function hideAssistPlayerAnimated(playerId: string) {
    setCollapsingAssistPlayers((prev) => ({
      ...prev,
      [playerId]: true,
    }));

    setTimeout(() => {
      toggleAssist(playerId, 0);
      setCollapsingAssistPlayers((prev) => ({
        ...prev,
        [playerId]: false,
      }));
    }, 180);
  }

  function restoreHiddenAssistPlayer(playerId: string) {
    setHiddenAssistPlayers((prev) => ({ ...prev, [playerId]: false }));
    setCollapsedAssistPlayers((prev) => ({ ...prev, [playerId]: false }));
  }

  function setAssistPrestige(playerId: string, value: number) {
    if (toNumber(current.assistRecipients?.[playerId]) <= 0) {
      updateCurrent({
        assistPrestigeRecipients: {
          ...(current.assistPrestigeRecipients ?? {}),
          [playerId]: 0,
        },
      });
      return;
    }

    updateCurrent({
      assistPrestigeRecipients: {
        ...(current.assistPrestigeRecipients ?? {}),
        [playerId]: value,
      },
    });
  }

  function setOtherPlayerObjective(playerId: string, value: number) {
    setObjectiveAwardsByPlayer((prev) => ({
      ...prev,
      [playerId]: Math.max(0, clampCount(value)),
    }));
  }

  function clearObjectives() {
    const cleared: Record<string, number> = {};
    for (const player of otherPlayers) cleared[player.id] = 0;
    setObjectiveAwardsByPlayer(cleared);
    updateCurrent({ objectiveCount: 0 });
    setObjectivesCollapsed(true);
  }

  function clearAssistsAndCollapse() {
    const assistRecipients: Record<string, number> = {};
    const assistPrestigeRecipients: Record<string, number> = {};
    const nextCollapsed: Record<string, boolean> = {};
    const nextHidden: Record<string, boolean> = {};

    for (const player of otherPlayers) {
      assistRecipients[player.id] = 0;
      assistPrestigeRecipients[player.id] = 0;
      nextCollapsed[player.id] = false;
      nextHidden[player.id] = true;
    }

    setCollapsedAssistPlayers(nextCollapsed);
    setHiddenAssistPlayers(nextHidden);
    setCollapsingAssistPlayers({});
    updateCurrent({ assistRecipients, assistPrestigeRecipients });
    setAssistsCollapsed(false);
  }

  function resetTurnEditorState() {
    setContractChoice(0);
    setFailureChoice(0);
    setObjectiveAwardsByPlayer({});
    setEditingRoundId(null);
    setStayAtBaseSelected(false);
    setAssistsCollapsed(false);
    setObjectivesCollapsed(false);
    setShowPreviousRounds(false);
    setCollapsedAssistPlayers({});
    setHiddenAssistPlayers({});
    setCollapsingAssistPlayers({});
    preBaseSnapshotRef.current = null;
  }

  function validateNoNegativeTotalPrestige(candidateRounds: any[]) {
    return buildTotals(candidateRounds as any, players as any);
  }

  function toggleStayAtBase() {
    if (stayAtBaseSelected) {
      const snapshot = preBaseSnapshotRef.current;
      setStayAtBaseSelected(false);
      preBaseSnapshotRef.current = null;

      if (snapshot) {
        setContractChoice(snapshot.contractChoice);
        setFailureChoice(snapshot.failureChoice);
        setAssistsCollapsed(snapshot.assistsCollapsed);
        setCollapsedAssistPlayers(snapshot.collapsedAssistPlayers);
        setHiddenAssistPlayers(snapshot.hiddenAssistPlayers);

        commitGameplayPatch({
          current: {
            ...snapshot.current,
            assistRecipients: { ...(snapshot.current.assistRecipients ?? {}) },
            assistPrestigeRecipients: { ...(snapshot.current.assistPrestigeRecipients ?? {}) },
          },
        });
      } else {
        setContractChoice(0);
        setFailureChoice(0);
        setAssistsCollapsed(false);
        commitGameplayPatch({
          current: {
            contracts: 0,
            failures: 0,
          },
        });
      }

      return;
    }

    preBaseSnapshotRef.current = {
      current: {
        ...current,
        assistRecipients: { ...(current.assistRecipients ?? {}) },
        assistPrestigeRecipients: { ...(current.assistPrestigeRecipients ?? {}) },
      },
      contractChoice,
      failureChoice,
      assistsCollapsed,
      collapsedAssistPlayers: { ...collapsedAssistPlayers },
      hiddenAssistPlayers: { ...hiddenAssistPlayers },
    };

    setStayAtBaseSelected(true);
    setContractChoice(0);
    setFailureChoice(0);
    setAssistsCollapsed(true);

    commitGameplayPatch({
      current: {
        prestige: current.prestige ?? 0,
        contracts: 0,
        failures: 0,
        assistRecipients: current.assistRecipients ?? {},
        assistPrestigeRecipients: current.assistPrestigeRecipients ?? {},
        objectiveCount: current.objectiveCount ?? 0,
      },
    });
  }

  function saveRoundAndAdvance() {
    try {
      if (!canSubmitTurn) {
        Alert.alert('Invalid turn', 'Please fix the turn inputs first.');
        return;
      }

      const candidate = buildSubmitRoundCandidate({
        activeTurnPlayerId: activeTurnPlayer.id,
        current,
        existingRounds: rounds,
        objectiveAwardsByPlayer,
      });
      const nextTotals = validateNoNegativeTotalPrestige(candidate.nextRounds);
      if (!nextTotals) return;

      const leaders = getLeadingPlayerIds(nextTotals, players as any);
      commitGameplayPatch({
        rounds: candidate.nextRounds,
        current: { ...initialCurrentState },
        turnIndex: getNextTurnIndex(activeGame.turnIndex, players.length),
        totals: nextTotals,
        roundCount: candidate.nextRounds.length,
      });

      resetTurnEditorState();
    } catch (error) {
      console.error('End Turn failed:', error);
      Alert.alert('Error', 'Something went wrong ending the turn.');
    }
  }

  function saveEdit() {
    try {
      if (!editingRoundId) return;
      const candidate = buildEditRoundCandidate({
        editingRoundId,
        current,
        existingRounds: rounds,
        objectiveAwardsByPlayer,
      });
      if (!candidate) return;
      const nextTotals = validateNoNegativeTotalPrestige(candidate.nextRounds);
      if (!nextTotals) return;

      commitGameplayPatch({
        rounds: candidate.nextRounds,
        totals: nextTotals,
        current: { ...initialCurrentState },
        roundCount: candidate.nextRounds.length,
      });

      resetTurnEditorState();
    } catch (error) {
      console.error('Save Edit failed:', error);
      Alert.alert('Error', 'Something went wrong saving the edit.');
    }
  }

  function editPreviousRound(round: StoredRound) {
    try {
      const linkedRounds = rounds.filter((candidate) => candidate.linkedTurnId === round.id);
      const editState = buildEditStateFromRound(round, linkedRounds);
      const nextAssistCollapsed: Record<string, boolean> = {};
      const nextHidden: Record<string, boolean> = {};

      for (const player of players) {
        if (player.id === round.playerId) continue;
        nextAssistCollapsed[player.id] = false;
        nextHidden[player.id] = toNumber(editState.current.assistRecipients?.[player.id]) <= 0;
      }

      setEditingRoundId(round.id);
      setContractChoice(editState.contractChoice);
      setFailureChoice(editState.failureChoice);
      setObjectiveAwardsByPlayer(editState.bonusObjectiveCounts);
      setStayAtBaseSelected(editState.current.contracts === 0 && editState.current.failures === 0);
      setAssistsCollapsed(false);
      setObjectivesCollapsed(false);
      setShowPreviousRounds(false);
      setCollapsedAssistPlayers(nextAssistCollapsed);
      setHiddenAssistPlayers(nextHidden);
      setCollapsingAssistPlayers({});
      preBaseSnapshotRef.current = null;

      commitGameplayPatch({
        current: {
          ...editState.current,
          assistRecipients: { ...(editState.current.assistRecipients ?? {}) },
          assistPrestigeRecipients: { ...(editState.current.assistPrestigeRecipients ?? {}) },
        },
      });
    } catch (error) {
      console.error('Edit Previous Round failed:', error);
      Alert.alert('Error', 'Could not load that round for editing.');
    }
  }

  function togglePreviousRounds() {
    if (!latestDisplayRound) {
      Alert.alert('No previous turn', 'There are no saved turns to edit yet.');
      return;
    }
    setShowPreviousRounds((prev) => !prev);
  }

  function confirmFinishGame() {
    if (!rounds.length || !finishWinnerId) {
      Alert.alert('No turns saved', 'Save at least one turn before finishing.');
      return;
    }

    Alert.alert('Finish Game?', 'This will permanently record the results and close the session. You cannot undo this.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Submit Results',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            await commitFinishGame();
            if (authSession?.user?.id) {
              try {
                const hydratedSnapshot = await loadHydratedCloudState(authSession as any);
                hydrateCloudSnapshot(hydratedSnapshot);
              } catch {
                // Keep the finish flow intact if the post-submit refresh misses.
              }
            }
          })();
        },
      },
    ]);
  }

  return (
    <View style={[styles.screen, { backgroundColor: appBackground }]}>
      <ScreenBackground preset="tactical" />

      <View
        pointerEvents="none"
        style={[
          styles.starfieldDim,
          { backgroundColor: withAlpha(UI.black, 0.54) },
        ]}
      />

      <View
        pointerEvents="none"
        style={[
          styles.pageWash,
          {
            backgroundColor: stayAtBaseSelected
              ? withAlpha(UI.gold, 0.025)
              : makePlayerWash(currentAccent, 0.05),
          },
        ]}
      />

      <View
        style={[
          styles.heroStickyShell,
          {
            paddingTop: 10 + insets.top,
            backgroundColor: appBackground,
          },
        ]}
      >
        <View
          style={[
            styles.heroCard,
            {
              borderColor: editingRoundId ? withAlpha(UI.gold, 0.28) : withAlpha(currentAccent, 0.24),
              backgroundColor: UI.panelElevated,
            },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroHeaderSpacer} />

            <View style={styles.heroHeaderCopy}>
              {editingRoundId ? (
                <Text style={styles.heroEyebrow}>Editing Previous Turn</Text>
              ) : null}

              <View style={styles.heroIdentityRow}>
                <View
                  style={[
                    styles.nameBadge,
                    {
                      backgroundColor: currentDark,
                      borderColor: withAlpha(currentAccent, 0.34),
                    },
                  ]}
                >
                  <Text style={styles.nameBadgeText}>{currentPlayer.name}</Text>
                </View>

                <View
                  style={[
                    styles.roundBadge,
                    {
                      backgroundColor: currentDarker,
                      borderColor: withAlpha(currentAccent, 0.22),
                    },
                  ]}
                >
                  <Text style={styles.roundBadgeText}>
                    Round {editingDisplayRoundNumber ?? displayRounds.length + 1}
                  </Text>
                </View>
              </View>
            </View>

            <Pressable
              style={styles.commandButton}
              onPress={() => router.push(APP_ROUTES.home)}
            >
              <Text style={styles.commandButtonText}>Back to Command</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: 0,
            paddingBottom: 14 + insets.bottom,
          },
        ]}
      >
        <CompactPlayerStrip players={leaderboardPlayers} activePlayerId={currentPlayer.id} totals={totals} />

        <AppStatusBanner
          status={currentStatus}
          onDismiss={currentStatus ? clearCurrentStatus : null}
        />

        <DirectPrestigeSection
          currentDirectPrestige={toNumber(current.prestige)}
          onSetDirectPrestige={(next) => updateCurrent({ prestige: next })}
          currentAccent={currentAccent}
          contractChoice={contractChoice}
          failureChoice={failureChoice}
          onSelectContract={applyContractChoice}
          onSelectFailure={applyFailureChoice}
          stayAtBaseSelected={stayAtBaseSelected}
        />

        <AssistSection
          currentAccent={currentAccent}
          otherPlayers={otherPlayers}
          currentAssistRecipients={current.assistRecipients ?? {}}
          currentAssistPrestigeRecipients={current.assistPrestigeRecipients ?? {}}
          onToggleAssist={toggleAssist}
          onSetAssistPrestige={setAssistPrestige}
          collapsed={assistsCollapsed}
          onToggleCollapsed={() => setAssistsCollapsed((value) => !value)}
          onSelectNone={clearAssistsAndCollapse}
          collapsedByPlayer={collapsedAssistPlayers}
          setCollapsedAssistPlayers={setCollapsedAssistPlayers}
          hiddenAssistPlayers={hiddenAssistPlayers}
          onRestoreHiddenPlayer={restoreHiddenAssistPlayer}
          collapsingAssistPlayers={collapsingAssistPlayers}
          onHideAssistAnimated={hideAssistPlayerAnimated}
        />

        <ObjectivesSection
          currentAccent={currentAccent}
          currentPlayerId={currentPlayer.id}
          currentObjectiveCount={clampCount(current.objectiveCount)}
          onSetCurrentObjectiveCount={(next) => updateCurrent({ objectiveCount: next })}
          playersInTurnOrder={players}
          objectiveAwardsByPlayer={objectiveAwardsByPlayer}
          onSetOtherPlayerObjective={setOtherPlayerObjective}
          collapsed={objectivesCollapsed}
          onToggleCollapsed={() => setObjectivesCollapsed((value) => !value)}
          onSelectNone={clearObjectives}
        />

        {showPreviousRounds ? (
          <PreviousRoundsSection
            displayRounds={displayRounds}
            allRounds={rounds}
            players={players}
            onEditPreviousRound={editPreviousRound}
          />
        ) : null}

        <ActionsSection
          bottomInset={insets.bottom}
          editingRoundId={editingRoundId}
          canSubmitTurn={canSubmitTurn}
          canEditPreviousTurn={!!latestDisplayRound}
          showPreviousRounds={showPreviousRounds}
          stayAtBaseSelected={stayAtBaseSelected}
          onStayAtBase={toggleStayAtBase}
          onEditPreviousTurn={togglePreviousRounds}
          onSaveOrAdvance={editingRoundId ? saveEdit : saveRoundAndAdvance}
          onFinishGame={confirmFinishGame}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: UI.black,
  },
  starfieldDim: {
    ...StyleSheet.absoluteFillObject,
  },
  pageWash: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 14,
    gap: 8,
  },
  heroStickyShell: {
    zIndex: 4,
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  heroCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    gap: 6,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  heroHeaderSpacer: {
    width: 128,
  },
  heroHeaderCopy: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    gap: 6,
  },
  heroEyebrow: {
    color: UI.textMuted,
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  heroIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  nameBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  nameBadgeText: {
    color: UI.text,
    fontSize: 16,
    fontWeight: '800',
  },
  roundBadge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  roundBadgeText: {
    color: UI.text,
    fontSize: 11,
    fontWeight: '700',
  },
  commandButton: {
    minWidth: 128,
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: withAlpha(UI.text, 0.16),
    backgroundColor: UI.cardMuted,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  commandButtonText: {
    color: UI.text,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  playerStripRow: {
    gap: 4,
    paddingRight: 8,
    alignItems: 'center',
  },
  playerPill: {
    minHeight: 40,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playerPillRail: {
    width: 8,
    height: 24,
    borderRadius: 999,
  },
  playerPillName: {
    color: UI.text,
    fontSize: 12,
    fontWeight: '800',
    maxWidth: 96,
  },
  playerPillMetrics: {
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  metricChip: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: UI.cardMuted,
    borderWidth: 1,
    borderColor: UI.line,
  },
  metricChipText: {
    color: UI.text,
    fontSize: 10,
    fontWeight: '600',
  },
  sectionCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 8,
    gap: 6,
  },
  directPrestigeFrame: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 6,
    gap: 4,
  },
  directPrestigeFrameMinimized: {
    paddingVertical: 9,
  },
  prestigeCounterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  prestigeStepperButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prestigeStepperText: {
    color: UI.text,
    fontSize: 24,
    fontWeight: '800',
  },
  prestigeCenterWrap: {
    width: 108,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prestigeValueBox: {
    width: 108,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#000000',
    borderWidth: 1.5,
    borderColor: withAlpha(UI.gold, 0.52),
    alignItems: 'center',
    justifyContent: 'center',
  },
  prestigeValueText: {
    color: UI.text,
    fontSize: 21,
    fontWeight: '800',
  },
  contractRow: {
    flexDirection: 'row',
    gap: 5,
  },
  contractButton: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1.25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  contractButtonExpanded: {
    flex: 1,
  },
  contractButtonMinimized: {
    width: 56,
  },
  contractIcon: {
    fontSize: 20,
    fontWeight: '800',
  },
  contractLabel: {
    color: UI.text,
    fontSize: 11,
    fontWeight: '700',
  },
  baseModeBoxElite: {
    minHeight: 52,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: withAlpha(UI.gold, 0.72),
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  baseModeTextElite: {
    color: UI.gold,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  sectionTitle: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerTapZone: {
    flex: 1,
    borderRadius: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chevron: {
    color: UI.textMuted,
    fontSize: 14,
    fontWeight: '700',
  },
  assistHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  assistHeaderRight: {
  flexDirection: 'row',
  alignItems: 'center',
  flex: 1,
},

assistDotsScroll: {
  flexGrow: 0,
  flexShrink: 1,
},

assistHeaderActions: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 6,
  paddingLeft: 6,
},

noneChip: {
  marginLeft: 'auto',
  minWidth: 66,
  height: 36,
  borderRadius: 8,
  alignItems: 'center',
  justifyContent: 'center',
  borderWidth: 1,
  borderColor: UI.lineStrong,
  backgroundColor: UI.cardMuted,
},
  noneChipText: {
    color: UI.text,
    fontSize: 11,
    fontWeight: '600',
  },
  headerRestoreDotButton: {
    width: 24,
    height: 24,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRestoreDotOnly: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  rowsStack: {
    gap: 0,
  },
  playerRowCard: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 7,
    overflow: 'hidden',
  },
  assistSingleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  assistNameWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minWidth: 78,
    flexShrink: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  assistInlineControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexShrink: 0,
  },
  assistInlinePrestige: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  colorBullet: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  playerRowTitle: {
    color: UI.text,
    fontSize: 11,
    fontWeight: '700',
  },
  choiceChip: {
    minWidth: 48,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceChipQuiet: {
    borderColor: UI.line,
    backgroundColor: UI.cardMuted,
  },
  choiceChipText: {
    color: UI.text,
    fontSize: 11,
    fontWeight: '600',
  },
  miniStepper: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: UI.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.cardMuted,
  },
  miniStepperText: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '700',
  },
  miniValue: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '700',
    minWidth: 14,
    textAlign: 'center',
  },
  objectiveRowCard: {
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  objectiveNameWrap: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginRight: 6,
  },
  objectiveName: {
    color: UI.text,
    fontSize: 12,
    fontWeight: '700',
  },
  objectiveControlsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  objectiveMiniButton: {
    width: 28,
    height: 28,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: UI.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.cardMuted,
  },
  objectiveMiniButtonText: {
    color: UI.text,
    fontSize: 15,
    fontWeight: '700',
  },
  objectiveValuePill: {
    minWidth: 40,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: UI.cardMuted,
    borderWidth: 1,
    borderColor: UI.line,
  },
  objectiveValueText: {
    color: UI.text,
    fontSize: 14,
    fontWeight: '700',
  },
  previousRoundRow: {
    borderRadius: 10,
    borderWidth: 1,
    minHeight: 36,
    paddingHorizontal: 8,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  previousRoundText: {
    color: UI.text,
    fontSize: 11,
    fontWeight: '700',
  },
  previousRoundMetric: {
    color: UI.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  actionsWrap: {
    gap: 5,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  actionButton: {
    flex: 1,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  actionButtonCompact: {
    minHeight: 38,
    paddingVertical: 5,
  },
  actionButtonTall: {
    minHeight: 76,
    paddingVertical: 12,
  },
  secondaryAction: {
    backgroundColor: UI.cardMuted,
    borderColor: UI.lineStrong,
  },
  baseAction: {
    backgroundColor: '#0a0a0a',
    borderColor: withAlpha(UI.gold, 0.36),
  },
  baseActionActive: {
    backgroundColor: '#000000',
    borderColor: withAlpha(UI.gold, 0.68),
  },
  baseActionText: {
    color: UI.gold,
  },
  endTurnAction: {
    backgroundColor: withAlpha(UI.success, 0.08),
    borderColor: withAlpha(UI.success, 0.34),
  },
  finishAction: {
    backgroundColor: withAlpha(UI.failure, 0.08),
    borderColor: withAlpha(UI.failure, 0.32),
  },
  actionText: {
    color: UI.text,
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.45,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: UI.text,
    fontSize: 18,
    fontWeight: '800',
  },
});
