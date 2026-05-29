import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";

import DefinitionRichText from "@/components/ui/DefinitionRichText";
import type { MoonrakersIntelProfile } from "@/utils/playerProfileMoonrakers";
import { buildDefinitionsRoute } from "@/utils/appRoutes";

const COLORS = {
  panel: "rgba(10,20,40,0.92)",
  panelAlt: "rgba(15,23,42,0.94)",
  border: "rgba(255,255,255,0.08)",
  text: "#E2E8F0",
  sub: "#94A3B8",
  accent: "#A855F7",
  accentSoft: "rgba(168,85,247,0.16)",
  blue: "#60A5FA",
  blueSoft: "rgba(96,165,250,0.14)",
  green: "#22C55E",
  greenSoft: "rgba(34,197,94,0.14)",
  gold: "#2DD4BF",
  goldSoft: "rgba(45,212,191,0.14)",
  red: "#F87171",
  redSoft: "rgba(248,113,113,0.14)",
};

type Tone = "accent" | "blue" | "green" | "gold" | "red" | "default";

function getToneStyles(tone: Tone) {
  switch (tone) {
    case "accent":
      return { borderColor: `${COLORS.accent}55`, backgroundColor: COLORS.accentSoft, valueColor: COLORS.accent };
    case "blue":
      return { borderColor: `${COLORS.blue}55`, backgroundColor: COLORS.blueSoft, valueColor: COLORS.blue };
    case "green":
      return { borderColor: `${COLORS.green}55`, backgroundColor: COLORS.greenSoft, valueColor: COLORS.green };
    case "gold":
      return { borderColor: `${COLORS.gold}55`, backgroundColor: COLORS.goldSoft, valueColor: COLORS.gold };
    case "red":
      return { borderColor: `${COLORS.red}55`, backgroundColor: COLORS.redSoft, valueColor: COLORS.red };
    default:
      return {
        borderColor: COLORS.border,
        backgroundColor: "rgba(255,255,255,0.04)",
        valueColor: COLORS.text,
      };
  }
}

function MetricCard({
  label,
  value,
  sub,
  tone = "default",
  onPress,
  ctaLabel,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: Tone;
  onPress?: (() => void) | null;
  ctaLabel?: string;
}) {
  const toneStyles = getToneStyles(tone);
  const Wrapper = onPress ? Pressable : View;

  return (
    <Wrapper
      onPress={onPress ?? undefined}
      style={[
        styles.metricCard,
        {
          borderColor: toneStyles.borderColor,
          backgroundColor: toneStyles.backgroundColor,
        },
      ]}
    >
      <View style={styles.metricHeader}>
        <Text style={styles.metricLabel}>{label}</Text>
        {ctaLabel ? <Text style={styles.metricCta}>{ctaLabel}</Text> : null}
      </View>
      <Text style={[styles.metricValue, { color: toneStyles.valueColor }]}>{value}</Text>
      <DefinitionRichText text={sub} style={styles.metricSub} />
    </Wrapper>
  );
}

function SectionBlock({
  title,
  children,
  accessory,
}: {
  title: string;
  children: React.ReactNode;
  accessory?: React.ReactNode;
}) {
  return (
    <View style={styles.subsection}>
      <View style={styles.subsectionHeader}>
        <Text style={styles.subsectionTitle}>{title}</Text>
        {accessory}
      </View>
      <View style={styles.metricGrid}>{children}</View>
    </View>
  );
}

function EmptyMetric({
  label,
  sub,
  onPress,
  ctaLabel,
}: {
  label: string;
  sub: string;
  onPress?: (() => void) | null;
  ctaLabel?: string;
}) {
  return (
    <MetricCard
      label={label}
      value="Not enough games yet"
      sub={sub}
      tone="red"
      onPress={onPress}
      ctaLabel={ctaLabel}
    />
  );
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: Tone;
}) {
  const toneStyles = getToneStyles(tone);

  return (
    <View
      style={[
        styles.statusBadge,
        {
          borderColor: toneStyles.borderColor,
          backgroundColor: toneStyles.backgroundColor,
        },
      ]}
    >
      <Text style={styles.statusBadgeTitle}>Import Health</Text>
      <Text style={[styles.statusBadgeValue, { color: toneStyles.valueColor }]}>{label}</Text>
    </View>
  );
}

export default function MoonrakersIntelSection({
  profile,
}: {
  profile: MoonrakersIntelProfile;
}) {
  const router = useRouter();

  function openDefinition(metricKey: string) {
    router.push(buildDefinitionsRoute(metricKey));
  }

  if (profile.hasData === false) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Moonrakers Intel</Text>
          <DefinitionRichText
            text="Playstyle and condition reads"
            style={styles.subtitle}
          />
        </View>

        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{profile.emptyTitle}</Text>
          <Text style={styles.emptyBody}>{profile.emptyBody}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Moonrakers Intel</Text>
        <DefinitionRichText
          text="Playstyle and condition reads"
          style={styles.subtitle}
        />
      </View>

      <SectionBlock title="Playstyle">
        <MetricCard
          label="Direct / Game"
          value={profile.playstyle.directPrestigePerGameLabel}
          sub="Direct prestige pace"
          tone="accent"
        />
        <MetricCard
          label="Assist Received / Game"
          value={profile.playstyle.assistPrestigeReceivedPerGameLabel}
          sub="Support prestige received"
          tone="blue"
        />
        <MetricCard
          label="Objective Prestige / Game"
          value={profile.playstyle.objectivePointsPerGameLabel}
          sub="Bonus objective pace"
          tone="gold"
        />
        <MetricCard
          label="Base Turns / Game"
          value={profile.playstyle.baseTurnsPerGameLabel}
          sub="Stay-at-base tempo"
          tone="green"
          onPress={() => openDefinition("baseTurnsPerGame")}
          ctaLabel="Definition"
        />
        <MetricCard
          label="Base Rate"
          value={profile.playstyle.baseRateLabel}
          sub="Share of playable turns"
          tone="green"
          onPress={() => openDefinition("baseRate")}
          ctaLabel="Definition"
        />
        <MetricCard
          label="Style Read"
          value={profile.playstyle.styleRead}
          sub="Profile fingerprint"
          tone="accent"
          onPress={() => openDefinition("styleRead")}
          ctaLabel="Definition"
        />
      </SectionBlock>

      <SectionBlock title="Best Condition">
        {profile.bestCondition ? (
          <>
            <MetricCard
              label="Condition"
              value={profile.bestCondition.label}
              sub="Strongest supported split"
              tone="green"
              onPress={() => openDefinition("bestCondition")}
              ctaLabel="Definition"
            />
            <MetricCard
              label="Win Rate"
              value={profile.bestCondition.winRateLabel}
              sub="Wins in that condition"
              tone="green"
            />
            <MetricCard
              label="Avg Prestige"
              value={profile.bestCondition.avgPrestigeLabel}
              sub="Average prestige there"
              tone="blue"
            />
            <MetricCard
              label="Sample"
              value={profile.bestCondition.sampleSizeLabel}
              sub="Tracked games used"
              tone="default"
            />
          </>
        ) : (
          <EmptyMetric
            label="Best Condition"
            sub="Need at least 3 games in one supported split."
            onPress={() => openDefinition("bestCondition")}
            ctaLabel="Definition"
          />
        )}
      </SectionBlock>

      <SectionBlock title="Worst Condition">
        {profile.worstCondition ? (
          <>
            <MetricCard
              label="Condition"
              value={profile.worstCondition.label}
              sub="Weakest supported split"
              tone="red"
              onPress={() => openDefinition("worstCondition")}
              ctaLabel="Definition"
            />
            <MetricCard
              label="Win Rate"
              value={profile.worstCondition.winRateLabel}
              sub="Wins in that condition"
              tone="red"
            />
            <MetricCard
              label="Avg Prestige"
              value={profile.worstCondition.avgPrestigeLabel}
              sub="Average prestige there"
              tone="blue"
            />
            <MetricCard
              label="Sample"
              value={profile.worstCondition.sampleSizeLabel}
              sub="Tracked games used"
              tone="default"
            />
          </>
        ) : (
          <EmptyMetric
            label="Worst Condition"
            sub="Need at least 3 games in one supported split."
            onPress={() => openDefinition("worstCondition")}
            ctaLabel="Definition"
          />
        )}
      </SectionBlock>

      <SectionBlock title="Base Discipline">
        <MetricCard
          label="Base Rate"
          value={profile.baseDiscipline.baseRateLabel}
          sub="Average stay-at-base share"
          tone="green"
          onPress={() => openDefinition("baseRate")}
          ctaLabel="Definition"
        />
        <MetricCard
          label="Base Turns / Game"
          value={profile.baseDiscipline.baseTurnsPerGameLabel}
          sub="Average base turns"
          tone="green"
          onPress={() => openDefinition("baseTurnsPerGame")}
          ctaLabel="Definition"
        />
        <MetricCard
          label="Win Rate With Base"
          value={profile.baseDiscipline.winRateWithBaseLabel}
          sub="Games with any base turn"
          tone="blue"
        />
        <MetricCard
          label="Win Rate Without Base"
          value={profile.baseDiscipline.winRateWithoutBaseLabel}
          sub="Games with zero base turns"
          tone="blue"
        />
        <MetricCard
          label="Prestige With Base"
          value={profile.baseDiscipline.prestigeWithBaseLabel}
          sub="Average prestige with base turns"
          tone="default"
        />
        <MetricCard
          label="Prestige Without Base"
          value={profile.baseDiscipline.prestigeWithoutBaseLabel}
          sub="Average prestige without base turns"
          tone="default"
        />
      </SectionBlock>

      <SectionBlock title="Objective Profile">
        <MetricCard
          label="Objective Prestige / Game"
          value={profile.objectiveProfile.objectivePointsPerGameLabel}
          sub="Average objective output"
          tone="gold"
        />
        <MetricCard
          label="Games With Objectives"
          value={profile.objectiveProfile.gamesWithObjectivesLabel}
          sub="Games scoring any objective prestige"
          tone="gold"
        />
        <MetricCard
          label="Win Rate With Objectives"
          value={profile.objectiveProfile.winRateWithObjectivesLabel}
          sub="Wins when scoring objectives"
          tone="green"
        />
        <MetricCard
          label="Win Rate Without Objectives"
          value={profile.objectiveProfile.winRateWithoutObjectivesLabel}
          sub="Wins without objective prestige"
          tone="blue"
        />
        <MetricCard
          label="Prestige With Objectives"
          value={profile.objectiveProfile.prestigeWithObjectivesLabel}
          sub="Average prestige with objectives"
          tone="default"
        />
        <MetricCard
          label="High Objective Games"
          value={profile.objectiveProfile.highObjectiveGamesLabel}
          sub="Games with 2+ objective prestige"
          tone="gold"
        />
      </SectionBlock>

      <SectionBlock title="Support Profile">
        <MetricCard
          label="Assists Given / Game"
          value={profile.supportProfile.assistsGivenPerGameLabel}
          sub="Average outgoing assists"
          tone="blue"
        />
        <MetricCard
          label="Assists Received / Game"
          value={profile.supportProfile.assistsReceivedPerGameLabel}
          sub="Average incoming assists"
          tone="blue"
        />
        {profile.supportProfile.bestSupportPartner ? (
          <MetricCard
            label="Best Support Partner"
            value={profile.supportProfile.bestSupportPartner.playerName}
            sub={`${profile.supportProfile.bestSupportPartner.winRateLabel} win | ${profile.supportProfile.bestSupportPartner.sampleSizeLabel}`}
            tone="green"
          />
        ) : (
          <EmptyMetric label="Best Support Partner" sub="Need at least 3 shared games." />
        )}
        {profile.supportProfile.mostCommonAssistTarget ? (
          <MetricCard
            label="Most Common Assist Target"
            value={profile.supportProfile.mostCommonAssistTarget.playerName}
            sub={`${profile.supportProfile.mostCommonAssistTarget.assistsSentLabel} assists | ${profile.supportProfile.mostCommonAssistTarget.sampleSizeLabel}`}
            tone="accent"
          />
        ) : (
          <EmptyMetric label="Most Common Assist Target" sub="Need at least 3 shared games with tracked assists." />
        )}
        <MetricCard
          label="Support Style"
          value={profile.supportProfile.supportStyle}
          sub="Giving vs receiving profile"
          tone="accent"
          onPress={() => openDefinition("supportStyle")}
          ctaLabel="Definition"
        />
      </SectionBlock>

      <SectionBlock
        title="Assist Context"
        accessory={
          <StatusBadge
            label={profile.assistContext.importHealthLabel}
            tone={profile.assistContext.importHealthTone}
          />
        }
      >
        {profile.assistContext.assistGapToTargetLabel ? (
          <MetricCard
            label="Assist Gap to Target"
            value={profile.assistContext.assistGapToTargetLabel}
            sub={`Avg pre-assist prestige gap | ${profile.assistContext.timedAssistEventsLabel}`}
            tone="blue"
            onPress={() => openDefinition("assistGapToTarget")}
            ctaLabel="Definition"
          />
        ) : (
          <EmptyMetric
            label="Assist Gap to Target"
            sub="Need tracked assist direction and at least one assist."
            onPress={() => openDefinition("assistGapToTarget")}
            ctaLabel="Definition"
          />
        )}
        {profile.assistContext.assistGapToLeaderLabel ? (
          <MetricCard
            label="Assist Gap to Leader"
            value={profile.assistContext.assistGapToLeaderLabel}
            sub={`Avg gap to current leader | ${profile.assistContext.timedAssistEventsLabel}`}
            tone="gold"
            onPress={() => openDefinition("assistGapToLeader")}
            ctaLabel="Definition"
          />
        ) : (
          <EmptyMetric
            label="Assist Gap to Leader"
            sub="Need tracked assist direction and at least one assist."
            onPress={() => openDefinition("assistGapToLeader")}
            ctaLabel="Definition"
          />
        )}
        {profile.assistContext.assistsAtSixPlusLabel ? (
          <MetricCard
            label="Assists at 6+ Prestige"
            value={profile.assistContext.assistsAtSixPlusLabel}
            sub={`Share of timed assists | ${profile.assistContext.timedAssistEventsLabel}`}
            tone="accent"
            onPress={() => openDefinition("assistsAtSixPlus")}
            ctaLabel="Definition"
          />
        ) : (
          <EmptyMetric
            label="Assists at 6+ Prestige"
            sub="Need tracked assist-direction games for this player."
            onPress={() => openDefinition("assistsAtSixPlus")}
            ctaLabel="Definition"
          />
        )}
        {profile.assistContext.assistsOverFiveBehindLeaderLabel ? (
          <MetricCard
            label="Assists Over 5 Behind Leader"
            value={profile.assistContext.assistsOverFiveBehindLeaderLabel}
            sub={`Share of timed assists | ${profile.assistContext.timedAssistEventsLabel}`}
            tone="red"
            onPress={() => openDefinition("assistsOverFiveBehindLeader")}
            ctaLabel="Definition"
          />
        ) : (
          <EmptyMetric
            label="Assists Over 5 Behind Leader"
            sub="Need tracked assist-direction games for this player."
            onPress={() => openDefinition("assistsOverFiveBehindLeader")}
            ctaLabel="Definition"
          />
        )}
        {profile.assistContext.assistPrestigeGainedLabel ? (
          <MetricCard
            label="Assist Prestige Gained"
            value={profile.assistContext.assistPrestigeGainedLabel}
            sub={
              profile.assistContext.assistPrestigePerAssistLabel
                ? `${profile.assistContext.assistPrestigePerAssistLabel} per assist | ${profile.assistContext.assistEventsLabel}`
                : `Total helper prestige earned | ${profile.assistContext.trackedGamesLabel}`
            }
            tone="green"
            onPress={() => openDefinition("assistPrestigeGained")}
            ctaLabel="Definition"
          />
        ) : (
          <EmptyMetric
            label="Assist Prestige Gained"
            sub="Need tracked assist data or legacy assist source totals."
            onPress={() => openDefinition("assistPrestigeGained")}
            ctaLabel="Definition"
          />
        )}
      </SectionBlock>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.panel,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 18,
    gap: 18,
  },
  headerRow: {
    gap: 4,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: "800",
  },
  subtitle: {
    color: COLORS.sub,
    fontSize: 13,
  },
  subsection: {
    gap: 10,
  },
  subsectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  subsectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
    flexShrink: 1,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48%",
    minHeight: 96,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  metricHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  metricLabel: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    flexShrink: 1,
  },
  metricCta: {
    color: COLORS.blue,
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: "800",
  },
  metricSub: {
    color: COLORS.sub,
    fontSize: 12,
    lineHeight: 16,
  },
  statusBadge: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignItems: "flex-end",
    gap: 2,
  },
  statusBadgeTitle: {
    color: COLORS.sub,
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statusBadgeValue: {
    fontSize: 11,
    fontWeight: "800",
  },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.panelAlt,
    padding: 16,
    gap: 8,
  },
  emptyTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
  },
  emptyBody: {
    color: COLORS.sub,
    fontSize: 13,
    lineHeight: 18,
  },
});
