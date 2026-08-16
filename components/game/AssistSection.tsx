import React, { useEffect, useRef } from 'react';
import { Animated, Easing, ScrollView, View } from 'react-native';

import Text from '@/components/ui/Text';
import { glowStyle, withAlpha } from '@/utils/gameScreenTheme';
import { toNumber } from '@/utils/numbers';
import { resolveStoredPlayerColor } from '@/utils/playerColor';
import { getPlayerAccentColor } from '@/utils/turnTheme';

import ScaleButton from './ScaleButton';
import { UI, type Player } from './gameScreenUi';
import { styles } from './gameScreenStyles';

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
    outputRange: [0, 52],
  });

  const animatedMarginBottom = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 2],
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

export default function AssistSection({
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
  <ScaleButton
    onPress={onToggleCollapsed}
    accessibilityLabel="Assists"
    accessibilityHint={collapsed ? 'Expand assists' : 'Collapse assists'}
    style={styles.headerTapZone}
  >
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
            accessibilityLabel={`Show assist row for ${player.name}`}
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

    <ScaleButton
      onPress={onSelectNone}
      accessibilityLabel="No assists this turn"
      style={styles.noneChip}
    >
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
                    !assistOn && styles.playerRowCardQuiet,
                    assistOn && {
                      backgroundColor: withAlpha(accent, 0.08),
                      borderColor: withAlpha(accent, 0.45),
                    },
                    assistOn
                      ? glowStyle(withAlpha(accent, 0.9), 0.2, 10, 7)
                      : glowStyle(withAlpha(accent, 0.9), 0.06, 5, 2),
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
                        !assistOn && styles.assistNameWrapQuiet,
                        assistOn && {
                          backgroundColor: withAlpha(accent, 0.1),
                          borderColor: withAlpha(accent, 0.22),
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.colorBullet,
                          { backgroundColor: withAlpha(accent, assistOn ? 1 : 0.72) },
                        ]}
                      />
                      <Text style={[styles.playerRowTitle, !assistOn && styles.playerRowTitleQuiet]}>
                        {player.name}
                      </Text>
                      <Text style={styles.chevron}>{rowCollapsed ? '▾' : '▴'}</Text>
                    </ScaleButton>

                    {!rowCollapsed ? (
                      <View style={styles.assistInlineControls}>
                        <ScaleButton
                          onPress={() => onHideAssistAnimated(player.id)}
                          accessibilityLabel={`No assist from ${player.name}`}
                          accessibilityState={{ selected: !assistOn }}
                          style={[styles.choiceChip, styles.choiceChipQuiet]}
                        >
                          <Text style={styles.choiceChipText}>No</Text>
                        </ScaleButton>

                        <ScaleButton
                          onPress={() => onToggleAssist(player.id, 1)}
                          accessibilityLabel={`Assist from ${player.name}`}
                          accessibilityState={{ selected: assistOn }}
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
                            accessibilityLabel={`Decrease assist prestige from ${player.name}`}
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
                            accessibilityLabel={`Increase assist prestige from ${player.name}`}
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
