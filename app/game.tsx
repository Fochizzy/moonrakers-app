import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useKeepAwake } from 'expo-keep-awake';
import { View, ScrollView, Alert, Pressable } from 'react-native';
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
import { buildUndoLastTurnCandidate } from '@/lib/game-session/undoLastTurn';
import { getFallbackPlayerColor, resolveStoredPlayerColor } from '@/utils/playerColor';
import {
  getNextTurnIndex,
  buildTotals,
  getLeaderboard,
  type CurrentTurnStats,
} from '@/engine/gameEngine';
import {
  getPlayerAccentColor,
  getPlayerBackgroundColor,
} from '@/utils/turnTheme';
import { APP_ROUTES, buildHomeRoute } from '@/utils/appRoutes';
import {
  makePlayerWash,
  mixWithBlack,
  withAlpha,
} from '@/utils/gameScreenTheme';
import { sanitizeHeadToHeadSelection } from '@/utils/headToHeadMission';
import { toNumber } from '@/utils/numbers';
import { formatDuration } from '@/utils/turnPace';
import { remove } from '@/utils/storage/storage';
import {
  commitFeedback,
  selectionFeedback,
  successFeedback,
  warningFeedback,
} from '@/utils/haptics';

import ActionsSection from '@/components/game/ActionsSection';
import AssistSection from '@/components/game/AssistSection';
import CompactPlayerStrip from '@/components/game/CompactPlayerStrip';
import DirectPrestigeSection from '@/components/game/DirectPrestigeSection';
import ObjectivesSection from '@/components/game/ObjectivesSection';
import PreviousRoundsSection from '@/components/game/PreviousRoundsSection';
import {
  UI,
  clampCount,
  getDisplayRounds,
  initialCurrentState,
  type BinaryChoice,
  type HeadToHeadMissionSummary,
  type Player,
  type StoredRound,
} from '@/components/game/gameScreenUi';
import { styles } from '@/components/game/gameScreenStyles';

function buildEditStateFromRound(
  round: StoredRound,
  linkedRounds: StoredRound[]
): {
  current: CurrentTurnStats;
  contractChoice: BinaryChoice;
  failureChoice: BinaryChoice;
  bonusObjectiveCounts: Record<string, number>;
  headToHeadFirstPlaceId: string | null;
  headToHeadSecondPlaceId: string | null;
} {
  const firstPlaceRound =
    linkedRounds.find((linkedRound) => linkedRound.metaType === 'headToHeadFirstPlace') ?? null;
  const secondPlaceRound =
    linkedRounds.find((linkedRound) => linkedRound.metaType === 'headToHeadSecondPlace') ?? null;
  const headToHeadSelection = sanitizeHeadToHeadSelection(
    firstPlaceRound?.playerId,
    secondPlaceRound?.playerId,
  );
  const current: CurrentTurnStats = {
    prestige: toNumber(round?.prestige),
    contracts: Math.min(Math.max(toNumber(round?.contracts), 0), 1),
    failures: Math.min(Math.max(toNumber(round?.failures), 0), 1),
    assistRecipients: { ...(round?.assistRecipients ?? {}) },
    assistPrestigeRecipients: { ...(round?.assistPrestigeRecipients ?? {}) },
    objectiveCount: clampCount(round?.objectiveCount ?? round?.objectivePrestige),
    headToHeadFirstPlaceId: headToHeadSelection.firstPlaceId,
    headToHeadSecondPlaceId: headToHeadSelection.secondPlaceId,
  };

  const bonusObjectiveCounts: Record<string, number> = {};

  for (const linkedRound of linkedRounds) {
    if (!linkedRound?.playerId) continue;
    if (linkedRound.playerId === round.playerId) continue;
    if (linkedRound.metaType !== 'bonusObjective') continue;
    bonusObjectiveCounts[linkedRound.playerId] = clampCount(
      linkedRound.objectiveCount ?? linkedRound.objectivePrestige
    );
  }

  return {
    current,
    contractChoice: current.contracts === 1 ? 1 : 0,
    failureChoice: current.failures === 1 ? 1 : 0,
    bonusObjectiveCounts,
    headToHeadFirstPlaceId: headToHeadSelection.firstPlaceId,
    headToHeadSecondPlaceId: headToHeadSelection.secondPlaceId,
  };
}
export default function Game() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // The phone sits on the table as the scoreboard for the whole session, so
  // hold the screen on for as long as this route is mounted.
  useKeepAwake();

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
    ensureDraftForLegacyActiveGame,
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
    if (!activeGame || gameDraft || !authSession?.user?.id) {
      return;
    }

    void ensureDraftForLegacyActiveGame(activeGame);
  }, [activeGame, authSession?.user?.id, ensureDraftForLegacyActiveGame, gameDraft]);

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

  const leaderboardEntries = useMemo(
    () => getLeaderboard(totals as any, players as any, rounds as any),
    [totals, players, rounds]
  );
  const headToHeadMissionSummary = useMemo<HeadToHeadMissionSummary | null>(() => {
    const selection = sanitizeHeadToHeadSelection(
      current.headToHeadFirstPlaceId,
      current.headToHeadSecondPlaceId,
    );
    if (!selection.firstPlaceId || !selection.secondPlaceId) {
      return null;
    }

    const firstPlaceName =
      players.find((player) => player.id === selection.firstPlaceId)?.name ?? '1st place set';
    const secondPlaceName =
      players.find((player) => player.id === selection.secondPlaceId)?.name ?? '2nd place set';

    return {
      firstPlaceName,
      secondPlaceName,
    };
  }, [current.headToHeadFirstPlaceId, current.headToHeadSecondPlaceId, players]);
  const headToHeadMissionActive = Boolean(headToHeadMissionSummary);
  const finishWinnerId = leaderboardEntries[0]?.id ?? null;
  const {
    isFinishingGame,
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
    if (!stayAtBaseSelected && !headToHeadMissionActive && !hasOutcomeSelection) return false;
    if (current.contracts === 1 && current.failures === 1) return false;
    return true;
  }, [
    activeGame,
    currentPlayer,
    players.length,
    stayAtBaseSelected,
    headToHeadMissionActive,
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

  // Elapsed table time, anchored on the first saved turn — the same anchor the
  // summary's Pace section uses. activeGame.createdAt is reprojected from the
  // draft's updatedAt on every write, so it cannot serve as a start time.
  const gameStartedAt = useMemo(() => {
    let earliest: number | null = null;
    for (const round of rounds) {
      const stamp = toNumber(round?.createdAt);
      if (stamp > 0 && (earliest === null || stamp < earliest)) {
        earliest = stamp;
      }
    }
    return earliest;
  }, [rounds]);

  const [elapsedLabel, setElapsedLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!gameStartedAt) {
      setElapsedLabel(null);
      return;
    }

    const update = () =>
      setElapsedLabel(formatDuration(Math.max(0, Date.now() - gameStartedAt)));

    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, [gameStartedAt]);

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

    const nextGameplay = {
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
    };

    // updateGameplay reprojects activeGame from the draft synchronously, so the
    // UI already reflects this patch on the next render. Writing activeGame
    // directly as well would be overwritten by that projection immediately.
    void updateGameplay(
      nextGameplay,
      phase,
    );
  }

  function updateCurrent(patch: Partial<CurrentTurnStats>) {
    commitGameplayPatch({ current: patch });
  }

  function clearHeadToHeadMission() {
    updateCurrent({ headToHeadFirstPlaceId: null, headToHeadSecondPlaceId: null });
  }

  function syncHeadToHeadMissionMode() {
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

    preBaseSnapshotRef.current = null;
    setStayAtBaseSelected(false);
    setContractChoice(0);
    setFailureChoice(0);
    setAssistsCollapsed(false);
    setCollapsedAssistPlayers(nextCollapsed);
    setHiddenAssistPlayers(nextHidden);
    setCollapsingAssistPlayers({});

    commitGameplayPatch({
      current: {
        prestige: 0,
        contracts: 0,
        failures: 0,
        assistRecipients,
        assistPrestigeRecipients,
        objectiveCount: current.objectiveCount ?? 0,
        headToHeadFirstPlaceId: current.headToHeadFirstPlaceId ?? null,
        headToHeadSecondPlaceId: current.headToHeadSecondPlaceId ?? null,
      },
    });
  }

  function applyContractChoice(next: 0 | 1) {
    selectionFeedback();
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
    selectionFeedback();
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

  function toggleAssist(playerId: string, next: 0 | 1, options?: { silent?: boolean }) {
    if (!options?.silent) selectionFeedback();
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
    selectionFeedback();
    setCollapsingAssistPlayers((prev) => ({
      ...prev,
      [playerId]: true,
    }));

    setTimeout(() => {
      // The tap already buzzed; the deferred commit should stay silent.
      toggleAssist(playerId, 0, { silent: true });
      setCollapsingAssistPlayers((prev) => ({
        ...prev,
        [playerId]: false,
      }));
    }, 180);
  }

  function restoreHiddenAssistPlayer(playerId: string) {
    selectionFeedback();
    setHiddenAssistPlayers((prev) => ({ ...prev, [playerId]: false }));
    setCollapsedAssistPlayers((prev) => ({ ...prev, [playerId]: false }));
  }

  function setAssistPrestige(playerId: string, value: number) {
    selectionFeedback();
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
    selectionFeedback();
    setObjectiveAwardsByPlayer((prev) => ({
      ...prev,
      [playerId]: Math.max(0, clampCount(value)),
    }));
  }

  function clearObjectives() {
    selectionFeedback();
    const cleared: Record<string, number> = {};
    for (const player of otherPlayers) cleared[player.id] = 0;
    setObjectiveAwardsByPlayer(cleared);
    updateCurrent({ objectiveCount: 0 });
    setObjectivesCollapsed(true);
  }

  function clearAssistsAndCollapse() {
    selectionFeedback();
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

  useEffect(() => {
    if (!headToHeadMissionActive) return;
    syncHeadToHeadMissionMode();
  }, [
    headToHeadMissionActive,
    current.headToHeadFirstPlaceId,
    current.headToHeadSecondPlaceId,
  ]);

  if (!activeGame?.players?.length || !activeTurnPlayer || !currentPlayer) {
    return (
      <View style={[styles.screen, { backgroundColor: UI.black }]}>
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyTitle}>No active game</Text>
        </View>
      </View>
    );
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
    selectionFeedback();
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
        headToHeadFirstPlaceId: null,
        headToHeadSecondPlaceId: null,
      },
    });
  }

  function saveRoundAndAdvance() {
    try {
      if (!canSubmitTurn) {
        warningFeedback();
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

      commitGameplayPatch({
        rounds: candidate.nextRounds,
        current: { ...initialCurrentState },
        turnIndex: getNextTurnIndex(activeGame.turnIndex, players.length),
        totals: nextTotals,
        roundCount: candidate.nextRounds.length,
      });

      commitFeedback();
      resetTurnEditorState();
    } catch (error) {
      console.error('End Turn failed:', error);
      warningFeedback();
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

      commitFeedback();
      resetTurnEditorState();
    } catch (error) {
      console.error('Save Edit failed:', error);
      warningFeedback();
      Alert.alert('Error', 'Something went wrong saving the edit.');
    }
  }

  function undoLastTurn() {
    if (editingRoundId) {
      return;
    }

    const candidate = buildUndoLastTurnCandidate({
      existingRounds: rounds,
      turnIndex: activeGame.turnIndex,
      playerIds: players.map((player) => player.id),
    });

    if (!candidate) {
      warningFeedback();
      Alert.alert('Nothing to undo', 'No turns have been saved yet.');
      return;
    }

    const undonePlayerName =
      players.find((player) => player.id === candidate.removedRound.playerId)?.name ??
      'that player';

    Alert.alert(
      'Undo last turn?',
      `This removes ${undonePlayerName}'s most recent turn and hands the turn back to them.`,
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Undo turn',
          style: 'destructive',
          onPress: () => {
            try {
              const nextTotals = validateNoNegativeTotalPrestige(candidate.nextRounds);
              if (!nextTotals) return;

              commitGameplayPatch({
                rounds: candidate.nextRounds,
                current: { ...initialCurrentState },
                turnIndex: candidate.nextTurnIndex,
                totals: nextTotals,
                roundCount: candidate.nextRounds.length,
              });

              commitFeedback();
              resetTurnEditorState();
            } catch (error) {
              console.error('Undo Last Turn failed:', error);
              warningFeedback();
              Alert.alert('Error', 'Something went wrong undoing that turn.');
            }
          },
        },
      ],
    );
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
      warningFeedback();
      Alert.alert('No previous turn', 'There are no saved turns to edit yet.');
      return;
    }
    selectionFeedback();
    setShowPreviousRounds((prev) => !prev);
  }

  function confirmFinishGame() {
    if (isFinishingGame) {
      return;
    }

    if (!rounds.length || !finishWinnerId) {
      warningFeedback();
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
            successFeedback();
            await commitFinishGame();
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
                {elapsedLabel ? ` · ${elapsedLabel}` : ''}
              </Text>
            </View>

            <View style={styles.heroHeaderCopy}>
              {editingRoundId ? (
                <Text style={styles.heroEyebrow}>Editing Previous Turn</Text>
              ) : null}

              <View
                style={[
                  styles.nameBadge,
                  {
                    backgroundColor: currentDark,
                    borderColor: withAlpha(currentAccent, 0.34),
                  },
                ]}
              >
                <Text
                  style={styles.nameBadgeText}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                >
                  {currentPlayer.name}
                </Text>
              </View>
            </View>

            <Pressable
              style={styles.commandButton}
              onPress={() => router.push(buildHomeRoute())}
            >
              <Text style={styles.commandButtonText}>Command</Text>
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
        <CompactPlayerStrip entries={leaderboardEntries} activePlayerId={currentPlayer.id} />

        <AppStatusBanner
          status={currentStatus}
          onDismiss={currentStatus ? clearCurrentStatus : null}
        />

        <DirectPrestigeSection
          currentDirectPrestige={toNumber(current.prestige)}
          onSetDirectPrestige={(next) => {
            selectionFeedback();
            updateCurrent({ prestige: next });
          }}
          currentAccent={currentAccent}
          contractChoice={contractChoice}
          failureChoice={failureChoice}
          onSelectContract={applyContractChoice}
          onSelectFailure={applyFailureChoice}
          stayAtBaseSelected={stayAtBaseSelected}
          headToHeadMissionSummary={headToHeadMissionSummary}
          onOpenHeadToHeadMission={() => router.push(APP_ROUTES.headToHeadMission)}
          onClearHeadToHeadMission={clearHeadToHeadMission}
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
          onSetCurrentObjectiveCount={(next) => {
            selectionFeedback();
            updateCurrent({ objectiveCount: next });
          }}
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
            onUndoLastTurn={undoLastTurn}
            canUndoLastTurn={!editingRoundId && displayRounds.length > 0}
          />
        ) : null}

        <ActionsSection
          bottomInset={insets.bottom}
          editingRoundId={editingRoundId}
          canSubmitTurn={canSubmitTurn}
          canEditPreviousTurn={!!latestDisplayRound}
          showPreviousRounds={showPreviousRounds}
          stayAtBaseSelected={stayAtBaseSelected}
          finishDisabled={isFinishingGame}
          onStayAtBase={toggleStayAtBase}
          onEditPreviousTurn={togglePreviousRounds}
          onSaveOrAdvance={editingRoundId ? saveEdit : saveRoundAndAdvance}
          onFinishGame={confirmFinishGame}
        />
      </ScrollView>
    </View>
  );
}
