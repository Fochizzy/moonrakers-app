import React from 'react';
import { View } from 'react-native';

import Text from '@/components/ui/Text';
import { glowStyle, mixWithBlack, withAlpha } from '@/utils/gameScreenTheme';

import HeadToHeadMissionSummaryText from './HeadToHeadMissionSummaryText';
import ScaleButton from './ScaleButton';
import { UI, type BinaryChoice, type HeadToHeadMissionSummary } from './gameScreenUi';
import { styles } from './gameScreenStyles';

export default function DirectPrestigeSection({
  currentDirectPrestige,
  currentAccent,
  onSetDirectPrestige,
  contractChoice,
  failureChoice,
  onSelectContract,
  onSelectFailure,
  stayAtBaseSelected,
  headToHeadMissionSummary,
  onOpenHeadToHeadMission,
  onClearHeadToHeadMission,
}: {
  currentDirectPrestige: number;
  currentAccent: string;
  onSetDirectPrestige: (next: number) => void;
  contractChoice: BinaryChoice;
  failureChoice: BinaryChoice;
  onSelectContract: (value: 0 | 1) => void;
  onSelectFailure: (value: 0 | 1) => void;
  stayAtBaseSelected: boolean;
  headToHeadMissionSummary: HeadToHeadMissionSummary | null;
  onOpenHeadToHeadMission: () => void;
  onClearHeadToHeadMission: () => void;
}) {
  const successSelected = contractChoice === 1;
  const failureSelected = failureChoice === 1;
  const darkerAccent = mixWithBlack(currentAccent, 0.82);
  const headToHeadMissionActive = Boolean(headToHeadMissionSummary);

  const counterTintAlpha =
    currentDirectPrestige <= 0 ? 0.1 : Math.min(0.1 + currentDirectPrestige * 0.025, 0.22);

  return (
    <View
      style={[
        styles.sectionCard,
        {
          borderColor: headToHeadMissionActive
            ? withAlpha(UI.silver, 0.5)
            : withAlpha(currentAccent, 0.36),
          backgroundColor: headToHeadMissionActive
            ? withAlpha(UI.silver, 0.12)
            : mixWithBlack(currentAccent, 0.84),
        },
        glowStyle(withAlpha(headToHeadMissionActive ? UI.silver : currentAccent, 0.95), 0.16, 8, 6),
      ]}
    >
      <View
        style={[
          styles.directPrestigeFrame,
          stayAtBaseSelected && styles.directPrestigeFrameMinimized,
          {
            backgroundColor: stayAtBaseSelected
              ? withAlpha(UI.gold, 0.05)
              : headToHeadMissionActive
              ? withAlpha(UI.silver, 0.12)
              : withAlpha(currentAccent, 0.09),
            borderColor: stayAtBaseSelected
              ? withAlpha(UI.gold, 0.44)
              : headToHeadMissionActive
              ? withAlpha(UI.silver, 0.5)
              : withAlpha(currentAccent, 0.38),
          },
          stayAtBaseSelected
            ? glowStyle(withAlpha(UI.gold, 0.92), 0.12, 6, 4)
            : headToHeadMissionActive
            ? glowStyle(withAlpha(UI.silver, 0.88), 0.16, 8, 5)
            : glowStyle(withAlpha(currentAccent, 0.95), 0.1, 6, 4),
        ]}
      >
        {!headToHeadMissionActive ? <Text style={styles.sectionTitle}>Direct Prestige</Text> : null}

        {stayAtBaseSelected ? (
          <View style={styles.baseModeBoxElite}>
            <Text style={styles.baseModeTextElite}>BASE</Text>
          </View>
        ) : headToHeadMissionActive ? (
          <View
            style={[
              styles.headToHeadActiveBox,
              {
                borderColor: withAlpha(UI.silver, 0.5),
                backgroundColor: withAlpha(UI.silver, 0.12),
              },
              glowStyle(withAlpha(UI.silver, 0.82), 0.14, 8, 5),
            ]}
          >
            <ScaleButton
              onPress={onOpenHeadToHeadMission}
              accessibilityLabel="Head to head mission"
              accessibilityHint="Choose first and second place"
              style={styles.headToHeadActiveBody}
            >
              <Text style={styles.headToHeadActiveTitle}>Head to Head</Text>
              {headToHeadMissionSummary ? (
                <View style={styles.headToHeadActiveSummaryWrap}>
                  <HeadToHeadMissionSummaryText summary={headToHeadMissionSummary} />
                </View>
              ) : null}
            </ScaleButton>
            <View style={styles.headToHeadActiveFooter}>
              <ScaleButton
                onPress={onClearHeadToHeadMission}
                accessibilityLabel="Clear head to head mission"
                style={styles.headToHeadActiveClearButton}
              >
                <Text style={styles.headToHeadActiveClearText}>Clear</Text>
              </ScaleButton>
            </View>
          </View>
        ) : (
          <>
            <View style={styles.prestigeCounterRow}>
              <ScaleButton
                onPress={() => onSetDirectPrestige(currentDirectPrestige - 1)}
                accessibilityLabel="Decrease direct prestige"
                accessibilityHint={`Currently ${currentDirectPrestige}`}
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
                accessibilityLabel="Increase direct prestige"
                accessibilityHint={`Currently ${currentDirectPrestige}`}
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
                accessibilityLabel="Contract completed"
                accessibilityState={{ selected: successSelected }}
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
                accessibilityLabel="Contract failed"
                accessibilityState={{ selected: failureSelected }}
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

            <ScaleButton
              onPress={onOpenHeadToHeadMission}
              style={[
                styles.headToHeadButton,
                {
                  borderColor: withAlpha(currentAccent, 0.36),
                  backgroundColor: withAlpha(currentAccent, 0.08),
                },
              ]}
            >
              <Text style={styles.headToHeadButtonTitle}>Head to Head Mission</Text>
            </ScaleButton>
          </>
        )}
      </View>
    </View>
  );
}
