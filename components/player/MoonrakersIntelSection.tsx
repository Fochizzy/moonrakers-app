import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { MoonrakersIntelProfile } from "@/utils/playerProfileMoonrakers";

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
  gold: "#FBBF24",
  goldSoft: "rgba(251,191,36,0.14)",
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
}: {
  label: string;
  value: string;
  sub: string;
  tone?: Tone;
}) {
  const toneStyles = getToneStyles(tone);

  return (
    <View
      style={[
        styles.metricCard,
        {
          borderColor: toneStyles.borderColor,
          backgroundColor: toneStyles.backgroundColor,
        },
      ]}
    >
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, { color: toneStyles.valueColor }]}>{value}</Text>
      <Text style={styles.metricSub}>{sub}</Text>
    </View>
  );
}

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.subsection}>
      <Text style={styles.subsectionTitle}>{title}</Text>
      <View style={styles.metricGrid}>{children}</View>
    </View>
  );
}

function EmptyMetric({
  label,
  sub,
}: {
  label: string;
  sub: string;
}) {
  return <MetricCard label={label} value="Not enough games yet" sub={sub} tone="red" />;
}

export default function MoonrakersIntelSection({
  profile,
}: {
  profile: MoonrakersIntelProfile;
}) {
  if (profile.hasData === false) {
    return (
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Moonrakers Intel</Text>
          <Text style={styles.subtitle}>Playstyle and condition reads</Text>
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
        <Text style={styles.subtitle}>Playstyle and condition reads</Text>
      </View>

      <SectionBlock title="Playstyle">
        <MetricCard
          label="Direct / Game"
          value={profile.playstyle.directPrestigePerGameLabel}
          sub="Direct prestige pace"
          tone="accent"
        />
        <MetricCard
          label="Assist Rec / Game"
          value={profile.playstyle.assistPrestigeReceivedPerGameLabel}
          sub="Support prestige received"
          tone="blue"
        />
        <MetricCard
          label="Objective Pts / Game"
          value={profile.playstyle.objectivePointsPerGameLabel}
          sub="Bonus objective pace"
          tone="gold"
        />
        <MetricCard
          label="Base Turns / Game"
          value={profile.playstyle.baseTurnsPerGameLabel}
          sub="Stay-at-base tempo"
          tone="green"
        />
        <MetricCard
          label="Base Rate"
          value={profile.playstyle.baseRateLabel}
          sub="Share of playable turns"
          tone="green"
        />
        <MetricCard
          label="Style Read"
          value={profile.playstyle.styleRead}
          sub="Profile fingerprint"
          tone="accent"
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
          <EmptyMetric label="Best Condition" sub="Need at least 3 games in one supported split." />
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
          <EmptyMetric label="Worst Condition" sub="Need at least 3 games in one supported split." />
        )}
      </SectionBlock>

      <SectionBlock title="Base Discipline">
        <MetricCard
          label="Base Rate"
          value={profile.baseDiscipline.baseRateLabel}
          sub="Average stay-at-base share"
          tone="green"
        />
        <MetricCard
          label="Base Turns / Game"
          value={profile.baseDiscipline.baseTurnsPerGameLabel}
          sub="Average base turns"
          tone="green"
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
          label="Objective Pts / Game"
          value={profile.objectiveProfile.objectivePointsPerGameLabel}
          sub="Average objective output"
          tone="gold"
        />
        <MetricCard
          label="Games With Objectives"
          value={profile.objectiveProfile.gamesWithObjectivesLabel}
          sub="Games scoring any objective points"
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
          sub="Wins without objective points"
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
          sub="Games with 2+ objective points"
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
          label="Assists Rec / Game"
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
        />
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
  subsectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: "700",
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
  metricLabel: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
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
