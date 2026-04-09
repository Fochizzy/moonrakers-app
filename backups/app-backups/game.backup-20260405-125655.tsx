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

import { useStore } from '@/store/useStore';
import Text from '@/components/ui/Text';
import StarryNight from '@/components/ui/StarryNight';
import LiveLeaderboard from '@/components/LiveLeaderboard';
import {
  createRound,
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
  getPlayerTintColor,
} from '@/utils/turnTheme';

type Player = {
  id: string;
  name: string;
  color?: string;
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

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function clampCount(value: unknown): number {
  return Math.max(0, Math.floor(toNumber(value)));
}

function getAssistCount(assistRecipients?: Record<string, number>) {
  return Object.values(assistRecipients ?? {}).filter((value) => toNumber(value) > 0).length;
}

function normalizeColor(color?: string) {
  return typeof color === 'string' ? color.trim().toLowerCase() : undefined;
}

function darkenHexColor(hex: string, amount = 0.55) {
  const safe = hex.replace('#', '');
  const normalized =
    safe.length === 3
      ? safe.split('').map((char) => char + char).join('')
      : safe.padEnd(6, '0').slice(0, 6);

  const num = parseInt(normalized, 16);
  const r = Math.max(0, Math.min(255, Math.round(((num >> 16) & 255) * (1 - amount))));
  const g = Math.max(0, Math.min(255, Math.round(((num >> 8) & 255) * (1 - amount))));
  const b = Math.max(0, Math.min(255, Math.round((num & 255) * (1 - amount))));
  return `rgb(${r}, ${g}, ${b})`;
}

function createObjectiveBonusRounds(
  linkedTurnId: string,
  objectiveAwardsByPlayer: Record<string, number>
): StoredRound[] {
  const bonusRounds: StoredRound[] = [];

  for (const [playerId, count] of Object.entries(objectiveAwardsByPlayer)) {
    const objectiveCount = clampCount(count);
    if (!playerId || objectiveCount <= 0) continue;

    bonusRounds.push({
      id: `${linkedTurnId}-obj-${playerId}`,
      playerId,
      prestige: 0,
      contracts: 0,
      failures: 0,
      assistRecipients: {},
      assistPrestigeRecipients: {},
      objectiveCount,
      objectivePrestige: objectiveCount,
      createdAt: Date.now(),
      metaType: 'bonusObjective',
      linkedTurnId,
    });
  }

  return bonusRounds;
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

function PrestigeCounter({
  label,
  value,
  onChange,
  accentColor,
  tintColor,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  accentColor?: string;
  tintColor?: string;
}) {
  return (
    <View
      style={[
        styles.prestigeBlock,
        accentColor ? { borderColor: `${accentColor}66` } : null,
        tintColor ? { backgroundColor: tintColor } : null,
      ]}
    >
      <Text
        style={[
          styles.prestigeLabel,
          accentColor ? { color: accentColor } : null,
        ]}
      >
        {label}
      </Text>

      <View style={styles.prestigeRow}>
        <Pressable
          style={[
            styles.prestigeButton,
            accentColor ? { borderColor: accentColor } : null,
          ]}
          onPress={() => onChange(value - 1)}
        >
          <Text style={styles.prestigeButtonText}>−</Text>
        </Pressable>

        <View
          style={[
            styles.prestigeValueCard,
            accentColor
              ? {
                  borderColor: accentColor,
                  backgroundColor: `${accentColor}22`,
                }
              : null,
          ]}
        >
          <Text style={styles.prestigeValue}>{value}</Text>
        </View>

        <Pressable
          style={[
            styles.prestigeButton,
            accentColor ? { borderColor: accentColor } : null,
          ]}
          onPress={() => onChange(value + 1)}
        >
          <Text style={styles.prestigeButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

function TurnHeader({
  currentPlayerName,
  currentAccent,
  roundNumber,
  isEditing,
}: {
  currentPlayerName: string;
  currentAccent: string;
  roundNumber: number;
  isEditing: boolean;
}) {
  return (
    <>
      <View style={styles.stickyHeaderWrap}>
        <View style={styles.headerBoard}>
          <Text style={styles.headerBoardTitle}>🌙 Moonraker&apos;s</Text>
          <Text style={styles.headerBoardSubtitle}>Active Game</Text>
        </View>
      </View>

      <View style={[styles.heroCard, { borderColor: `${currentAccent}88` }]}>
        <View
          style={[
            styles.heroAccentBar,
            { backgroundColor: currentAccent },
          ]}
        />
        <View style={styles.heroTopRow}>
          <View style={styles.heroTitleWrap}>
            <Text style={styles.heroSubtext}>
              {isEditing ? 'Editing Previous Turn' : 'Current Turn'}
            </Text>
            <View style={styles.currentPlayerRow}>
              <Text style={[styles.currentPlayer, { color: currentAccent }]}>
                {currentPlayerName}
              </Text>
              <View style={[styles.roundChip, { borderColor: `${currentAccent}66` }]}>
                <Text style={[styles.roundChipText, { color: currentAccent }]}>
                  Round {roundNumber}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </>
  );
}

function LeaderboardSection({
  gameId,
  players,
}: {
  gameId?: string;
  players: Array<{
    id: string;
    name: string;
    color?: string;
    totalPrestige?: number;
    directPrestige?: number;
    objectivePrestige?: number;
    assistPrestigeReceived?: number;
    score?: number;
    contracts?: number;
    assists?: number;
    momentumLabel?: string | null;
  }>;
}) {
  return (
    <View style={styles.leaderboardCompactWrap}>
      <LiveLeaderboard
        key={gameId ?? 'active-game'}
        gameId={gameId}
        title="Current Game"
        players={players}
      />
    </View>
  );
}

function TurnStatsSection({
  contractChoice,
  failureChoice,
  onSelectContract,
  onSelectFailure,
  currentAccent,
  stayAtBaseSelected,
  collapsed,
  onToggleCollapsed,
}: {
  contractChoice: BinaryChoice;
  failureChoice: BinaryChoice;
  onSelectContract: (value: 0 | 1) => void;
  onSelectFailure: (value: 0 | 1) => void;
  currentAccent: string;
  stayAtBaseSelected: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const outcomeStatus = stayAtBaseSelected
    ? 'Base Mode'
    : contractChoice === 1
      ? 'Contract Succeeded'
      : failureChoice === 1
        ? 'Contract Failed'
        : 'Incomplete';
  const contractActive = contractChoice === 1;
  const failureActive = failureChoice === 1;

  return (
    <View style={styles.card}>
      <Pressable onPress={onToggleCollapsed} style={styles.outcomeHeaderRow}>
        <Text style={styles.sectionTitle}>Missions • {outcomeStatus}</Text>
        <View style={styles.outcomeHeaderRight}>
          {stayAtBaseSelected ? (
            <View style={[styles.modeChip, { borderColor: `${currentAccent}66` }]}>
              <Text style={[styles.modeChipText, { color: currentAccent }]}>
                Base Mode
              </Text>
            </View>
          ) : null}
          <Text style={styles.chevronText}>{collapsed ? '▼' : '▲'}</Text>
        </View>
      </Pressable>

      {!collapsed ? (
        <View style={styles.outcomeRow}>
          <Pressable
            onPress={() => onSelectContract(contractActive ? 0 : 1)}
            style={[
              styles.outcomeButton,
              {
                borderColor: currentAccent,
                backgroundColor: contractActive ? currentAccent : 'rgba(30,41,59,0.92)',
              },
            ]}
          >
            <Text
              style={[
                styles.outcomeButtonLabel,
                contractActive && styles.outcomeButtonLabelActive,
              ]}
            >
              Contract Succeeded
            </Text>
          </Pressable>

          <Pressable
            onPress={() => onSelectFailure(failureActive ? 0 : 1)}
            style={[
              styles.outcomeButton,
              {
                borderColor: failureActive ? '#ef4444' : '#7f1d1d',
                backgroundColor: failureActive ? '#7f1d1d' : 'rgba(30,41,59,0.92)',
              },
            ]}
          >
            <Text
              style={[
                styles.outcomeButtonLabel,
                failureActive && styles.outcomeButtonLabelActive,
              ]}
            >
              Contract Failed
            </Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function DirectPrestigeSection({
  currentDirectPrestige,
  currentAccent,
  currentTint,
  onSetDirectPrestige,
}: {
  currentDirectPrestige: number;
  currentAccent: string;
  currentTint: string;
  onSetDirectPrestige: (next: number) => void;
}) {
  return (
    <View style={styles.card}>
      <View style={[styles.sectionAccentBar, { backgroundColor: currentAccent }]} />
      <View style={styles.directPrestigeCenterWrap}>
        <PrestigeCounter
          label="Direct Prestige"
          value={currentDirectPrestige}
          onChange={onSetDirectPrestige}
          accentColor={currentAccent}
          tintColor={currentTint}
        />
      </View>
    </View>
  );
}

function AssistSection({
  otherPlayers,
  currentAssistRecipients,
  currentAssistPrestigeRecipients,
  onToggleAssist,
  onSetAssistPrestige,
  collapsed,
  onToggleCollapsed,
  onSelectNone,
  collapsedByPlayer,
  onTogglePlayerCollapsed,
}: {
  otherPlayers: Player[];
  currentAssistRecipients: Record<string, number>;
  currentAssistPrestigeRecipients: Record<string, number>;
  onToggleAssist: (playerId: string, next: 0 | 1) => void;
  onSetAssistPrestige: (playerId: string, value: number) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectNone: () => void;
  collapsedByPlayer: Record<string, boolean>;
  onTogglePlayerCollapsed: (playerId: string) => void;
}) {
  const completedCount = otherPlayers.filter((player) =>
    Object.prototype.hasOwnProperty.call(currentAssistRecipients ?? {}, player.id)
  ).length;

  const assistStatus =
    otherPlayers.length === 0
      ? 'None'
      : completedCount === otherPlayers.length
        ? 'Complete'
        : `${completedCount}/${otherPlayers.length}`;

  return (
    <View style={styles.card}>
      <View style={styles.collapsibleHeaderRow}>
        <Pressable onPress={onToggleCollapsed} style={styles.flexHeaderTitle}>
          <Text style={styles.sectionTitle}>Assists • {assistStatus}</Text>
          <Text style={styles.chevronText}>{collapsed ? '▼' : '▲'}</Text>
        </Pressable>

        <Pressable onPress={onSelectNone} style={styles.noneButton}>
          <Text style={styles.noneButtonText}>None</Text>
        </Pressable>
      </View>

      {!collapsed ? (
        <View style={styles.verticalList}>
          {otherPlayers.map((player) => {
            const assistOn = toNumber(currentAssistRecipients[player.id]) > 0;
            const assistMarked = Object.prototype.hasOwnProperty.call(
              currentAssistRecipients ?? {},
              player.id
            );
            const assistAccent = getPlayerAccentColor(player.color);
            const assistTint = getPlayerTintColor(player.color);
            const rowCollapsed = !!collapsedByPlayer[player.id];

            return (
              <View
                key={player.id}
                style={[
                  styles.assistRowCard,
                  styles.fullWidthCard,
                  {
                    borderColor: assistAccent,
                    backgroundColor: assistOn ? assistTint : '#111a2b',
                  },
                ]}
              >
                <Pressable
                  style={styles.playerRowHeader}
                  onPress={() => onTogglePlayerCollapsed(player.id)}
                >
                  <View style={styles.playerInfo}>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: assistAccent },
                      ]}
                    />
                    <View style={styles.playerTextWrap}>
                      <Text style={styles.listTitle}>{player.name}</Text>
                      <Text style={styles.listMeta}>
                        {assistMarked
                          ? assistOn
                            ? 'Assisting this turn'
                            : 'Marked as not assisting'
                          : 'Assist not marked yet'}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.chevronText}>{rowCollapsed ? '▼' : '▲'}</Text>
                </Pressable>

                <View style={styles.yesNoRow}>
                  <Pressable
                    style={[
                      styles.choiceChip,
                      { borderColor: assistAccent },
                      !assistOn && assistMarked ? { backgroundColor: assistAccent } : null,
                    ]}
                    onPress={() => onToggleAssist(player.id, 0)}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        !assistOn && assistMarked && styles.choiceChipTextActive,
                      ]}
                    >
                      No
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.choiceChip,
                      { borderColor: assistAccent },
                      assistOn ? { backgroundColor: assistAccent } : null,
                    ]}
                    onPress={() => onToggleAssist(player.id, 1)}
                  >
                    <Text
                      style={[
                        styles.choiceChipText,
                        assistOn && styles.choiceChipTextActive,
                      ]}
                    >
                      Yes
                    </Text>
                  </Pressable>
                </View>

                {!rowCollapsed ? (
                  <View
                    style={[
                      styles.inlineAssistPrestigeWrap,
                      !assistOn && styles.inlineAssistPrestigeWrapDisabled,
                    ]}
                  >
                    <Text
                      style={[
                        styles.inlineAssistPrestigeLabel,
                        { color: assistAccent },
                      ]}
                    >
                      Assist Prestige
                    </Text>

                    <View style={styles.assistPrestigeBox}>
                      <Pressable
                        disabled={!assistOn}
                        style={[
                          styles.miniButton,
                          { borderColor: assistAccent },
                          !assistOn && styles.disabledMiniButton,
                        ]}
                        onPress={() =>
                          onSetAssistPrestige(
                            player.id,
                            toNumber(currentAssistPrestigeRecipients[player.id]) - 1
                          )
                        }
                      >
                        <Text style={styles.miniButtonText}>−</Text>
                      </Pressable>

                      <Text style={styles.assistPrestigeValue}>
                        {toNumber(currentAssistPrestigeRecipients[player.id])}
                      </Text>

                      <Pressable
                        disabled={!assistOn}
                        style={[
                          styles.miniButton,
                          { borderColor: assistAccent },
                          !assistOn && styles.disabledMiniButton,
                        ]}
                        onPress={() =>
                          onSetAssistPrestige(
                            player.id,
                            toNumber(currentAssistPrestigeRecipients[player.id]) + 1
                          )
                        }
                      >
                        <Text style={styles.miniButtonText}>+</Text>
                      </Pressable>
                    </View>
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function ObjectiveCounterCard({
  title,
  value,
  onChange,
  accentColor,
  tintColor,
  collapsed,
  onToggleCollapsed,
}: {
  title: string;
  value: number;
  onChange: (next: number) => void;
  accentColor?: string;
  tintColor?: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  return (
    <View
      style={[
        styles.smallObjectiveBlock,
        styles.fullWidthCard,
        accentColor ? { borderColor: `${accentColor}66` } : null,
        tintColor ? { backgroundColor: tintColor } : null,
      ]}
    >
      <Pressable style={styles.playerRowHeader} onPress={onToggleCollapsed}>
        <View style={styles.playerTextWrap}>
          <Text
            style={[
              styles.smallObjectiveTitle,
              accentColor ? { color: accentColor } : null,
            ]}
          >
            {title}
          </Text>
        </View>

        <Text style={styles.chevronText}>{collapsed ? '▼' : '▲'}</Text>
      </Pressable>

      {!collapsed ? (
        <View style={styles.smallObjectiveRow}>
          <Pressable
            style={[
              styles.smallObjectiveButton,
              accentColor ? { borderColor: accentColor } : null,
            ]}
            onPress={() => onChange(Math.max(0, value - 1))}
          >
            <Text style={styles.smallObjectiveButtonText}>−</Text>
          </Pressable>

          <View
            style={[
              styles.smallObjectiveValueCard,
              accentColor
                ? {
                    borderColor: accentColor,
                    backgroundColor: `${accentColor}22`,
                  }
                : null,
            ]}
          >
            <Text style={styles.smallObjectiveValue}>{value}</Text>
          </View>

          <Pressable
            style={[
              styles.smallObjectiveButton,
              accentColor ? { borderColor: accentColor } : null,
            ]}
            onPress={() => onChange(value + 1)}
          >
            <Text style={styles.smallObjectiveButtonText}>+</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ObjectivesSection({
  currentPlayerName,
  currentObjectiveCount,
  onSetCurrentObjectiveCount,
  otherPlayers,
  objectiveAwardsByPlayer,
  onSetOtherPlayerObjective,
  currentAccent,
  currentTint,
  collapsed,
  onToggleCollapsed,
  onSelectNone,
  collapsedByPlayer,
  onTogglePlayerCollapsed,
}: {
  currentPlayerName: string;
  currentObjectiveCount: number;
  onSetCurrentObjectiveCount: (next: number) => void;
  otherPlayers: Player[];
  objectiveAwardsByPlayer: Record<string, number>;
  onSetOtherPlayerObjective: (playerId: string, next: number) => void;
  currentAccent: string;
  currentTint: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onSelectNone: () => void;
  collapsedByPlayer: Record<string, boolean>;
  onTogglePlayerCollapsed: (playerId: string) => void;
}) {
  const totalAwarded =
    currentObjectiveCount +
    otherPlayers.reduce(
      (sum, player) => sum + clampCount(objectiveAwardsByPlayer[player.id]),
      0
    );

  return (
    <View style={styles.card}>
      <View style={styles.collapsibleHeaderRow}>
        <Pressable onPress={onToggleCollapsed} style={styles.flexHeaderTitle}>
          <Text style={styles.sectionTitle}>Objectives • {totalAwarded} awarded</Text>
          <Text style={styles.chevronText}>{collapsed ? '▼' : '▲'}</Text>
        </Pressable>

        <Pressable onPress={onSelectNone} style={styles.noneButton}>
          <Text style={styles.noneButtonText}>None</Text>
        </Pressable>
      </View>

      {!collapsed ? (
        <View style={styles.verticalList}>
          <ObjectiveCounterCard
            title={`${currentPlayerName} Objectives`}
            value={currentObjectiveCount}
            onChange={onSetCurrentObjectiveCount}
            accentColor={currentAccent}
            tintColor={currentTint}
            collapsed={!!collapsedByPlayer.self}
            onToggleCollapsed={() => onTogglePlayerCollapsed('self')}
          />

          {otherPlayers.map((player) => (
            <ObjectiveCounterCard
              key={`obj-${player.id}`}
              title={`${player.name} Objectives`}
              value={clampCount(objectiveAwardsByPlayer[player.id])}
              onChange={(next) => onSetOtherPlayerObjective(player.id, next)}
              accentColor={getPlayerAccentColor(player.color)}
              tintColor={getPlayerTintColor(player.color)}
              collapsed={!!collapsedByPlayer[player.id]}
              onToggleCollapsed={() => onTogglePlayerCollapsed(player.id)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function ActionsSection({
  editingRoundId,
  canSubmitTurn,
  canEditPreviousTurn,
  showPreviousRounds,
  onStayAtBase,
  onEditPreviousTurn,
  onSaveOrAdvance,
  onFinishGame,
}: {
  editingRoundId: string | null;
  canSubmitTurn: boolean;
  canEditPreviousTurn: boolean;
  showPreviousRounds: boolean;
  onStayAtBase: () => void;
  onEditPreviousTurn: () => void;
  onSaveOrAdvance: () => void;
  onFinishGame: () => void;
}) {
  return (
    <View style={styles.actionsStack}>
      <View style={styles.buttonRow}>
        <Pressable
          disabled={!canEditPreviousTurn}
          style={[
            styles.actionButton,
            styles.halfRowButton,
            styles.secondaryActionButton,
            styles.editPreviousButton,
            !canEditPreviousTurn && styles.disabledActionButton,
          ]}
          onPress={onEditPreviousTurn}
        >
          <Text style={styles.actionButtonText}>
            {showPreviousRounds ? 'Hide Previous Rounds' : 'Edit Previous Turn'}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.actionButton,
            styles.halfRowButton,
            styles.stayAtBaseButton,
          ]}
          onPress={onStayAtBase}
        >
          <Text style={styles.actionButtonText}>Stay at Base</Text>
        </Pressable>
      </View>

      <View style={styles.buttonRow}>
        <Pressable
          disabled={!canSubmitTurn}
          style={[
            styles.actionButton,
            styles.primaryActionButtonTall,
            styles.endTurnButton,
            !canSubmitTurn && styles.disabledActionButton,
          ]}
          onPress={onSaveOrAdvance}
        >
          <Text style={styles.endTurnButtonText}>
            {editingRoundId ? 'Save & Return to Active Turn' : 'End Turn'}
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.actionButton,
            styles.finishGameButton,
          ]}
          onPress={onFinishGame}
        >
          <Text style={styles.finishGameButtonText}>Finish Game</Text>
        </Pressable>
      </View>
    </View>
  );
}

function PreviousRoundsSection({
  displayRounds,
  allRounds,
  players,
  onEditPreviousRound,
  editingRoundId,
}: {
  displayRounds: StoredRound[];
  allRounds: StoredRound[];
  players: Player[];
  onEditPreviousRound: (round: StoredRound) => void;
  editingRoundId: string | null;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Previous Rounds</Text>

      {displayRounds.length === 0 ? (
        <Text style={styles.emptyText}>No saved rounds yet.</Text>
      ) : (
        <View style={styles.compactListTight}>
          {displayRounds.map((round, index) => {
            const linkedBonusRounds = allRounds.filter(
              (candidate) => candidate.linkedTurnId === round.id
            );
            const roundPlayer = players.find((p) => p.id === round.playerId);
            const roundAccent = getPlayerAccentColor(roundPlayer?.color);
            const assistCount = getAssistCount(round.assistRecipients);
            const objectivePrestige =
              clampCount(round.objectiveCount ?? round.objectivePrestige) +
              linkedBonusRounds.reduce(
                (sum, candidate) =>
                  sum + clampCount(candidate.objectiveCount ?? candidate.objectivePrestige),
                0
              );

            return (
              <Pressable
                key={round.id}
                style={[
                  styles.roundRowDense,
                  { borderColor: `${roundAccent}55` },
                  editingRoundId === round.id ? styles.roundRowDenseActive : null,
                ]}
                onPress={() => onEditPreviousRound(round)}
              >
                <View style={[styles.roundColorDot, { backgroundColor: roundAccent }]} />
                <Text style={styles.roundDensePrimary}>
                  R{index + 1} • {roundPlayer?.name ?? 'Unknown'}
                </Text>
                <Text style={styles.roundDenseMetric}>{toNumber(round.prestige)} Direct</Text>
                <Text style={styles.roundDenseMetric}>+{objectivePrestige} Obj</Text>
                <Text style={styles.roundDenseMetric}>{assistCount} Assist</Text>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function Game() {
  const router = useRouter();

  const activeGame = useStore((s: any) => s.activeGame);
  const patchActiveGame = useStore((s: any) => s.patchActiveGame);
  const clearActiveGame = useStore((s: any) => s.clearActiveGame);
  const addGame = useStore((s: any) => s.addGame);

  const [contractChoice, setContractChoice] = useState<BinaryChoice>(0);
  const [failureChoice, setFailureChoice] = useState<BinaryChoice>(0);
  const [editingRoundId, setEditingRoundId] = useState<string | null>(null);
  const [objectiveAwardsByPlayer, setObjectiveAwardsByPlayer] = useState<Record<string, number>>(
    {}
  );
  const [stayAtBaseSelected, setStayAtBaseSelected] = useState(false);
  const [assistsCollapsed, setAssistsCollapsed] = useState(false);
  const [objectivesCollapsed, setObjectivesCollapsed] = useState(false);
  const [missionsCollapsed, setMissionsCollapsed] = useState(false);
  const [showPreviousRounds, setShowPreviousRounds] = useState(false);
  const [collapsedAssistPlayers, setCollapsedAssistPlayers] = useState<Record<string, boolean>>({});
  const [collapsedObjectivePlayers, setCollapsedObjectivePlayers] = useState<Record<string, boolean>>(
    {}
  );

  const scrollViewRef = useRef<ScrollView>(null);

  const players = useMemo<Player[]>(
    () =>
      Array.isArray(activeGame?.players)
        ? activeGame.players.map((player: Player) => ({
            ...player,
            color: normalizeColor(player.color),
          }))
        : [],
    [activeGame?.players]
  );

  const activeTurnPlayer = players[activeGame?.turnIndex ?? 0] as Player | undefined;
  const rounds = (activeGame?.rounds ?? []) as StoredRound[];
  const current = (activeGame?.current ?? initialCurrentState) as CurrentTurnStats;

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

  const totals = useMemo(
    () => buildTotals(rounds as any, players as any),
    [rounds, players]
  );

  const displayRounds = useMemo(() => getDisplayRounds(rounds), [rounds]);

  const liveLeaderboardPlayers = useMemo(
    () =>
      players.map((player) => {
        const playerTotals = (totals?.[player.id] ?? {}) as Record<string, unknown>;
        const playerRounds = displayRounds.filter((round) => round.playerId === player.id);
        const latestRound = playerRounds[playerRounds.length - 1];

        return {
          id: player.id,
          name: player.name,
          color: player.color,
          totalPrestige: toNumber(playerTotals.totalPrestige),
          directPrestige: toNumber(playerTotals.directPrestige),
          objectivePrestige: toNumber(playerTotals.objectivePrestige),
          assistPrestigeReceived: toNumber(playerTotals.assistPrestigeReceived),
          score: toNumber(playerTotals.score),
          contracts: playerRounds.reduce((sum, round) => sum + toNumber(round.contracts), 0),
          assists: playerRounds.reduce((sum, round) => sum + getAssistCount(round.assistRecipients), 0),
          momentumLabel: latestRound
            ? `Last turn: ${toNumber(latestRound.prestige)} prestige`
            : null,
        };
      }),
    [players, totals, displayRounds]
  );

  const currentAccent = getPlayerAccentColor(currentPlayer?.color);
  const currentTint = getPlayerTintColor(currentPlayer?.color);
  const targetBackground = getPlayerBackgroundColor(currentPlayer?.color);
  const targetGradientTop = darkenHexColor(currentAccent, stayAtBaseSelected ? 0.78 : 0.62);

  const [baseBackground, setBaseBackground] = useState(targetBackground);
  const [gradientTop, setGradientTop] = useState(targetGradientTop);
  const [overlayBackground, setOverlayBackground] = useState(targetBackground);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (targetBackground === baseBackground) return;

    setOverlayBackground(baseBackground);
    setBaseBackground(targetBackground);
    fadeAnim.setValue(1);

    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [targetBackground, baseBackground, fadeAnim]);

  useEffect(() => {
    setGradientTop(targetGradientTop);
  }, [targetGradientTop]);

  useEffect(() => {
    if (!editingRoundId) return;
    if (!rounds.some((round) => round.id === editingRoundId)) {
      setEditingRoundId(null);
    }
  }, [editingRoundId, rounds]);

  const hasOutcomeSelection = current.contracts === 1 || current.failures === 1;

  const canSubmitTurn = useMemo(() => {
    if (!activeGame || !currentPlayer) return false;
    if (players.length < 2) return false;
    if (!stayAtBaseSelected && !hasOutcomeSelection) return false;
    if (current.contracts < 0 || current.failures < 0) return false;
    if (current.contracts > 1 || current.failures > 1) return false;
    if (current.contracts === 1 && current.failures === 1) return false;

    for (const value of Object.values(objectiveAwardsByPlayer)) {
      if (clampCount(value) < 0) return false;
    }

    return true;
  }, [
    activeGame,
    currentPlayer,
    players.length,
    stayAtBaseSelected,
    hasOutcomeSelection,
    current,
    objectiveAwardsByPlayer,
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
      <View style={[styles.screen, { backgroundColor: '#081120' }]}>
        <View style={styles.backgroundLayer}>
          <StarryNight />
          <View style={styles.backgroundDim} />
        </View>

        <View style={styles.centerEmptyWrap}>
          <View style={styles.headerBoard}>
            <Text style={styles.headerBoardTitle}>🌙 Moonraker&apos;s</Text>
            <Text style={styles.headerBoardSubtitle}>No active game</Text>
          </View>
        </View>
      </View>
    );
  }

  function updateCurrent(patch: Partial<CurrentTurnStats>) {
    patchActiveGame({
      current: {
        ...current,
        ...patch,
      },
    });
  }

  function applyContractChoice(next: 0 | 1) {
    setStayAtBaseSelected(false);
    setContractChoice(next);
    setMissionsCollapsed(next === 1);

    if (next === 1) {
      setFailureChoice(0);
      updateCurrent({ contracts: 1, failures: 0 });
      return;
    }

    updateCurrent({ contracts: 0 });
  }

  function applyFailureChoice(next: 0 | 1) {
    setStayAtBaseSelected(false);
    setFailureChoice(next);
    setMissionsCollapsed(next === 1);

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
      setCollapsedAssistPlayers((prev) => ({ ...prev, [playerId]: false }));
    } else {
      assistPrestigeRecipients[playerId] = 0;
      setCollapsedAssistPlayers((prev) => ({ ...prev, [playerId]: true }));
    }

    const allMarkedNo =
      otherPlayers.length > 0 &&
      otherPlayers.every((player) => toNumber(assistRecipients[player.id]) === 0);

    updateCurrent({ assistRecipients, assistPrestigeRecipients });

    if (allMarkedNo) {
      setAssistsCollapsed(true);
    } else {
      setAssistsCollapsed(false);
    }
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

  function sanitizeCurrentForRound(source: CurrentTurnStats): CurrentTurnStats {
    const sanitizedAssistRecipients = Object.fromEntries(
      Object.entries(source.assistRecipients ?? {}).filter(
        ([, value]) => toNumber(value) > 0
      )
    ) as Record<string, number>;

    const sanitizedAssistPrestigeRecipients = Object.fromEntries(
      Object.entries(source.assistPrestigeRecipients ?? {}).filter(
        ([playerId]) => toNumber(sanitizedAssistRecipients[playerId]) > 0
      )
    ) as Record<string, number>;

    return {
      ...source,
      assistRecipients: sanitizedAssistRecipients,
      assistPrestigeRecipients: sanitizedAssistPrestigeRecipients,
    };
  }

  function clearObjectivesAndCollapse() {
    const clearedObjectives: Record<string, number> = {};
    const nextCollapsed: Record<string, boolean> = { self: true };

    for (const player of otherPlayers) {
      clearedObjectives[player.id] = 0;
      nextCollapsed[player.id] = true;
    }

    setObjectiveAwardsByPlayer(clearedObjectives);
    setCollapsedObjectivePlayers(nextCollapsed);
    updateCurrent({ objectiveCount: 0 });
    setObjectivesCollapsed(true);
  }

  function clearAssistsAndCollapse() {
    const assistRecipients: Record<string, number> = {};
    const assistPrestigeRecipients: Record<string, number> = {};
    const nextCollapsed: Record<string, boolean> = {};

    for (const player of otherPlayers) {
      assistRecipients[player.id] = 0;
      assistPrestigeRecipients[player.id] = 0;
      nextCollapsed[player.id] = true;
    }

    setCollapsedAssistPlayers(nextCollapsed);
    updateCurrent({ assistRecipients, assistPrestigeRecipients });
    setAssistsCollapsed(true);
  }

  function resetTurnEditorState() {
    setContractChoice(0);
    setFailureChoice(0);
    setObjectiveAwardsByPlayer({});
    setEditingRoundId(null);
    setStayAtBaseSelected(false);
    setMissionsCollapsed(false);
    setAssistsCollapsed(false);
    setObjectivesCollapsed(false);
    setShowPreviousRounds(false);
    setCollapsedAssistPlayers({});
    setCollapsedObjectivePlayers({});

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    });
  }

  function buildCandidateRoundsForSubmit() {
    const mainRound = {
      ...(createRound(activeTurnPlayer.id, sanitizeCurrentForRound(current) as any) as StoredRound),
      metaType: 'main' as const,
    };

    const linkedTurnId = mainRound.id;
    const bonusRounds = createObjectiveBonusRounds(linkedTurnId, objectiveAwardsByPlayer);

    return {
      mainRound,
      bonusRounds,
      nextRounds: [...rounds, mainRound, ...bonusRounds] as any[],
    };
  }

  function buildCandidateRoundsForEdit() {
    if (!editingRoundId) return null;

    const originalMainRound = rounds.find((round) => round.id === editingRoundId);
    if (!originalMainRound) return null;

    const replacementMainRound: StoredRound = {
      ...(createRound(originalMainRound.playerId, sanitizeCurrentForRound(current) as any) as StoredRound),
      id: editingRoundId,
      createdAt: originalMainRound.createdAt,
      metaType: 'main',
    };

    const filteredRounds = rounds.filter(
      (round) => round.id !== editingRoundId && round.linkedTurnId !== editingRoundId
    );

    const replacementBonusRounds = createObjectiveBonusRounds(
      editingRoundId,
      objectiveAwardsByPlayer
    );

    const nextRounds = [
      ...filteredRounds,
      replacementMainRound,
      ...replacementBonusRounds,
    ].sort((a, b) => a.createdAt - b.createdAt) as any[];

    return {
      nextRounds,
      replacementMainRound,
    };
  }

  function validateNoNegativeTotalPrestige(candidateRounds: any[]) {
    const nextTotals = buildTotals(candidateRounds as any, players as any);

    for (const player of players) {
      const totalPrestige = getTotalPrestigeFromTotals(
        nextTotals[player.id] as PlayerTotals
      );

      if (totalPrestige < 0) {
        Alert.alert(
          'Invalid prestige total',
          `${player.name} can gain or lose prestige on a turn, but their cumulative total (direct + objective + assist prestige) cannot go below 0.`
        );
        return null;
      }
    }

    return nextTotals;
  }

  function stayAtBase() {
    resetTurnEditorState();
    setStayAtBaseSelected(true);
    setMissionsCollapsed(true);

    patchActiveGame({
      current: {
        prestige: 0,
        contracts: 0,
        failures: 0,
        assistRecipients: {},
        assistPrestigeRecipients: {},
        objectiveCount: 0,
      },
    });

    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    });
  }

  function saveRoundAndAdvance() {
    try {
      if (!canSubmitTurn) {
        Alert.alert('Invalid turn', 'Please fix the turn inputs first.');
        return;
      }

      const candidate = buildCandidateRoundsForSubmit();

      if (!candidate.mainRound?.id) {
        Alert.alert('Error', 'Could not create the turn round.');
        return;
      }

      const nextTotals = validateNoNegativeTotalPrestige(candidate.nextRounds);
      if (!nextTotals) return;

      const leaders = getLeadingPlayerIds(nextTotals, players as any);

      patchActiveGame({
        rounds: candidate.nextRounds,
        current: { ...initialCurrentState },
        turnIndex: getNextTurnIndex(activeGame.turnIndex, players.length),
        totals: nextTotals,
        showTieBreaker: leaders.length > 1,
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

      const candidate = buildCandidateRoundsForEdit();
      if (!candidate) return;

      const nextTotals = validateNoNegativeTotalPrestige(candidate.nextRounds);
      if (!nextTotals) return;

      patchActiveGame({
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
      const linkedRounds = rounds.filter(
        (candidate) => candidate.linkedTurnId === round.id
      );

      const editState = buildEditStateFromRound(round, linkedRounds);
      const nextAssistCollapsed: Record<string, boolean> = {};
      const nextObjectiveCollapsed: Record<string, boolean> = {};

      for (const player of players) {
        if (player.id === round.playerId) continue;
        nextAssistCollapsed[player.id] = toNumber(editState.current.assistRecipients[player.id]) <= 0;
      }

      nextObjectiveCollapsed.self = false;
      for (const player of players) {
        if (player.id === round.playerId) continue;
        nextObjectiveCollapsed[player.id] = false;
      }

      setEditingRoundId(round.id);
      setContractChoice(editState.contractChoice);
      setFailureChoice(editState.failureChoice);
      setObjectiveAwardsByPlayer(editState.bonusObjectiveCounts);
      setStayAtBaseSelected(editState.current.contracts === 0 && editState.current.failures === 0);
      setMissionsCollapsed(false);
      setAssistsCollapsed(false);
      setObjectivesCollapsed(false);
      setShowPreviousRounds(false);
      setCollapsedAssistPlayers(nextAssistCollapsed);
      setCollapsedObjectivePlayers(nextObjectiveCollapsed);

      patchActiveGame({
        current: {
          ...editState.current,
          assistRecipients: { ...(editState.current.assistRecipients ?? {}) },
          assistPrestigeRecipients: {
            ...(editState.current.assistPrestigeRecipients ?? {}),
          },
        },
      });

      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
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

  function commitFinishGame() {
    try {
      const finalTotals = buildTotals(rounds as any, players as any);
      const leaderboard = getLeaderboard(finalTotals, players as any);

      if (!leaderboard.length) {
        Alert.alert('No turns saved', 'Save at least one turn before finishing.');
        return;
      }

      const winnerId = leaderboard[0]?.id;

      addGame({
        id: activeGame.id,
        players: players.map((player) => ({
          ...player,
          totalPrestige: getTotalPrestigeFromTotals(
            finalTotals[player.id] as PlayerTotals
          ),
          directPrestige: finalTotals[player.id]?.directPrestige ?? 0,
          objectivePrestige: finalTotals[player.id]?.objectivePrestige ?? 0,
          score: finalTotals[player.id]?.score ?? 0,
        })),
        winnerId,
        selectedWinnerId: activeGame.selectedWinnerId ?? undefined,
        totals: finalTotals,
        rounds,
        timeline: rounds,
        roundCount: rounds.length,
        createdAt: activeGame.createdAt,
        groupId: activeGame.groupId,
        groupName: activeGame.groupName,
        objectiveStatsEligible: true,
      });

      clearActiveGame();
      router.replace('/');
    } catch (error) {
      console.error('Finish Game failed:', error);
      Alert.alert('Error', 'Something went wrong finishing the game.');
    }
  }

  function confirmFinishGame() {
    Alert.alert(
      'Finish Game?',
      'Are you sure you want to end the game? This will save the final result and leave the active game screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Finish Game', style: 'destructive', onPress: commitFinishGame },
      ]
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: baseBackground }]}>
      <View style={styles.backgroundLayer}>
        <StarryNight />
        <View style={styles.backgroundDim} />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.spaceGradientTop,
            { backgroundColor: gradientTop },
          ]}
        />
        <Animated.View
          pointerEvents="none"
          style={[
            styles.animatedAccentOverlay,
            {
              backgroundColor: currentTint,
              opacity: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.1, 0.22],
              }),
            },
          ]}
        />
      </View>

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <TurnHeader
          currentPlayerName={currentPlayer.name}
          currentAccent={currentAccent}
          roundNumber={editingDisplayRoundNumber ?? (displayRounds.length + 1)}
          isEditing={!!editingRoundId}
        />

        <LeaderboardSection
          gameId={activeGame?.id}
          players={liveLeaderboardPlayers as any}
        />

        <DirectPrestigeSection
          currentDirectPrestige={toNumber(current.prestige)}
          onSetDirectPrestige={(next) => updateCurrent({ prestige: next })}
          currentAccent={currentAccent}
          currentTint={currentTint}
        />

        <TurnStatsSection
          contractChoice={contractChoice}
          failureChoice={failureChoice}
          onSelectContract={applyContractChoice}
          onSelectFailure={applyFailureChoice}
          currentAccent={currentAccent}
          stayAtBaseSelected={stayAtBaseSelected}
          collapsed={missionsCollapsed}
          onToggleCollapsed={() => setMissionsCollapsed((value) => !value)}
        />

        <AssistSection
          otherPlayers={otherPlayers}
          currentAssistRecipients={current.assistRecipients ?? {}}
          currentAssistPrestigeRecipients={current.assistPrestigeRecipients ?? {}}
          onToggleAssist={toggleAssist}
          onSetAssistPrestige={setAssistPrestige}
          collapsed={assistsCollapsed}
          onToggleCollapsed={() => setAssistsCollapsed((value) => !value)}
          onSelectNone={clearAssistsAndCollapse}
          collapsedByPlayer={collapsedAssistPlayers}
          onTogglePlayerCollapsed={(playerId) =>
            setCollapsedAssistPlayers((prev) => ({
              ...prev,
              [playerId]: !prev[playerId],
            }))
          }
        />

        <ObjectivesSection
          currentPlayerName={currentPlayer.name}
          currentObjectiveCount={clampCount(current.objectiveCount)}
          onSetCurrentObjectiveCount={(next) => updateCurrent({ objectiveCount: next })}
          otherPlayers={otherPlayers}
          objectiveAwardsByPlayer={objectiveAwardsByPlayer}
          onSetOtherPlayerObjective={setOtherPlayerObjective}
          currentAccent={currentAccent}
          currentTint={currentTint}
          collapsed={objectivesCollapsed}
          onToggleCollapsed={() => setObjectivesCollapsed((value) => !value)}
          onSelectNone={clearObjectivesAndCollapse}
          collapsedByPlayer={collapsedObjectivePlayers}
          onTogglePlayerCollapsed={(playerId) =>
            setCollapsedObjectivePlayers((prev) => ({
              ...prev,
              [playerId]: !prev[playerId],
            }))
          }
        />

        {showPreviousRounds ? (
          <PreviousRoundsSection
            displayRounds={displayRounds}
            allRounds={rounds}
            players={players}
            onEditPreviousRound={editPreviousRound}
            editingRoundId={editingRoundId}
          />
        ) : null}

        <ActionsSection
          editingRoundId={editingRoundId}
          canSubmitTurn={canSubmitTurn}
          canEditPreviousTurn={!!latestDisplayRound}
          showPreviousRounds={showPreviousRounds}
          onStayAtBase={stayAtBase}
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
    backgroundColor: '#081120',
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(3,8,18,0.48)',
  },
  spaceGradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '58%',
    opacity: 0.9,
  },
  animatedAccentOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 24,
    gap: 8,
    alignItems: 'stretch',
  },
  stickyHeaderWrap: {
    paddingTop: 2,
    paddingBottom: 4,
    backgroundColor: 'transparent',
  },
  headerBoard: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: 'rgba(10, 18, 32, 0.96)',
    borderWidth: 1,
    borderColor: 'rgba(168, 85, 247, 0.35)',
  },
  headerBoardTitle: {
    color: '#a855f7',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
  },
  headerBoardSubtitle: {
    color: '#c4b5fd',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  heroCard: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgba(7, 14, 26, 0.94)',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    gap: 6,
  },
  heroAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  heroTopRow: {
    gap: 6,
  },
  heroTitleWrap: {
    gap: 4,
    alignItems: 'center',
  },
  currentPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  roundChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(15,23,42,0.92)',
  },
  roundChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroSubtext: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  currentPlayer: {
    fontSize: 20,
    fontWeight: '900',
  },
  leaderboardCompactWrap: {
    minHeight: 52,
    maxHeight: 64,
    overflow: 'hidden',
    alignSelf: 'stretch',
    marginTop: -2,
    marginBottom: 2,
  },
  card: {
    backgroundColor: 'rgba(11, 18, 31, 0.92)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(71, 85, 105, 0.42)',
    gap: 10,
    alignSelf: 'stretch',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: '#f8fafc',
  },
  collapsibleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  flexHeaderTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  playerRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  chevronText: {
    color: '#cbd5e1',
    fontSize: 14,
    fontWeight: '900',
  },
  noneButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderColor: 'rgba(148,163,184,0.5)',
  },
  noneButtonText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#f8fafc',
  },
  compactListTight: {
    gap: 4,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  listMeta: {
    marginTop: 1,
    fontSize: 11,
    color: '#8EA6C8',
  },
  directPrestigeCenterWrap: {
    alignItems: 'center',
    width: '100%',
  },
  prestigeBlock: {
    gap: 8,
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    width: '100%',
    maxWidth: 280,
    alignSelf: 'center',
  },
  prestigeLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  prestigeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  prestigeButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10243f',
    borderWidth: 1,
  },
  prestigeButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  prestigeValueCard: {
    minWidth: 72,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  prestigeValue: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '900',
  },
  twoColumnGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  halfWidthCard: {
    width: '48.5%',
  },
  verticalList: {
    width: '100%',
    gap: 8,
    alignSelf: 'stretch',
  },
  fullWidthCard: {
    width: '100%',
    alignSelf: 'stretch',
  },
  assistRowCard: {
    backgroundColor: '#111a2b',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    gap: 10,
    alignSelf: 'stretch',
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  playerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  colorDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
  },
  yesNoRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  choiceChip: {
    minWidth: 0,
    flex: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#10243f',
    borderWidth: 1,
    alignItems: 'center',
  },
  choiceChipText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '800',
  },
  choiceChipTextActive: {
    color: '#fff',
  },
  inlineAssistPrestigeWrap: {
    gap: 6,
    alignItems: 'center',
    width: '100%',
  },
  inlineAssistPrestigeWrapDisabled: {
    opacity: 0.45,
  },
  inlineAssistPrestigeLabel: {
    fontSize: 11,
    fontWeight: '800',
  },
  assistPrestigeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  miniButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1e293b',
    borderWidth: 1,
  },
  disabledMiniButton: {
    opacity: 0.45,
  },
  miniButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  assistPrestigeValue: {
    color: '#fff',
    minWidth: 20,
    textAlign: 'center',
    fontWeight: '800',
  },
  smallObjectiveBlock: {
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'stretch',
  },
  smallObjectiveTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  smallObjectiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  smallObjectiveButton: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10243f',
    borderWidth: 1,
  },
  smallObjectiveButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
  },
  smallObjectiveValueCard: {
    minWidth: 56,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: 'center',
    borderWidth: 1,
    flex: 1,
  },
  smallObjectiveValue: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    textAlign: 'center',
  },
  sectionAccentBar: {
    height: 4,
    borderRadius: 999,
    marginBottom: 2,
  },
  outcomeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  outcomeHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modeChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(15,23,42,0.92)',
  },
  modeChipText: {
    fontSize: 11,
    fontWeight: '800',
  },
  outcomeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  outcomeButton: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    gap: 4,
  },
  outcomeButtonLabel: {
    color: '#f8fafc',
    fontSize: 14,
    fontWeight: '900',
    textAlign: 'center',
  },
  outcomeButtonLabelActive: {
    color: '#ffffff',
  },
  roundRowDense: {
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(15,23,42,0.92)',
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  roundColorDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  roundRowDenseActive: {
    backgroundColor: 'rgba(51, 65, 85, 0.95)',
    borderWidth: 2,
  },
  roundDensePrimary: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '900',
  },
  roundDenseMetric: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
  },
  actionsStack: {
    gap: 8,
    marginTop: 4,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  halfRowButton: {
    flex: 1,
  },
  primaryActionButtonTall: {
    paddingVertical: 15,
  },
  secondaryActionButton: {
    backgroundColor: '#374151',
    borderColor: '#6b7280',
  },
  editPreviousButton: {
    borderColor: '#ffffff',
  },
  stayAtBaseButton: {
    backgroundColor: '#7f3f63',
    borderColor: '#ff4fa3',
    borderWidth: 2,
  },
  endTurnButton: {
    backgroundColor: '#7f1d1d',
    borderColor: '#ff3b30',
    borderWidth: 2,
    shadowColor: '#ff3b30',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.75,
    shadowRadius: 8,
    elevation: 10,
  },
  endTurnButtonText: {
    color: '#ffffff',
    fontWeight: '900',
  },
  disabledActionButton: {
    opacity: 0.45,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '900',
  },
  finishGameButton: {
    backgroundColor: '#05070b',
    borderColor: '#fbbf24',
  },
  finishGameButtonText: {
    color: '#f8fafc',
    fontWeight: '900',
  },
  emptyText: {
    fontSize: 12,
    lineHeight: 17,
    color: '#AFC3E0',
  },
  centerEmptyWrap: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
});


