import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import PageShell from "@/components/ui/PageShell";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import { APP_ROUTES } from "@/utils/appRoutes";

type DefinitionItem = {
  key: string;
  title: string;
  body: string;
};

type DefinitionGroup = {
  key: string;
  title: string;
  subtitle: string;
  items: DefinitionItem[];
};

const DEFINITION_GROUPS: DefinitionGroup[] = [
  {
    key: "scoring",
    title: "Scoring",
    subtitle: "What adds up on the final board.",
    items: [
      { key: "totalPrestige", title: "Prestige", body: "All prestige earned including direct, assist, and objective sources." },
      { key: "directPrestige", title: "Direct Prestige", body: "Prestige earned directly from your own actions and successful plays." },
      { key: "assistPrestigeReceived", title: "Assist Received", body: "Prestige gained from other players assisting your lines." },
      { key: "assistPrestigeSent", title: "Assist Sent", body: "Prestige value you contributed outward to the table." },
      { key: "score", title: "Score", body: "Composite scoring metric across prestige, contracts, assists, and penalties." },
      { key: "objectiveShareOfPrestige", title: "Objective Share", body: "The portion of total prestige that came from objectives." },
    ],
  },
  {
    key: "efficiency",
    title: "Efficiency",
    subtitle: "How cleanly actions turn into value.",
    items: [
      { key: "efficiency", title: "Efficiency", body: "Total value generated per combined contracts and assists." },
      { key: "assistanceEfficiency", title: "Assist Efficiency", body: "Value gained from assists relative to how often assists were involved." },
      { key: "directEfficiency", title: "Direct Efficiency", body: "Direct prestige produced per contract attempt." },
      { key: "prestigePerTurn", title: "Prestige / Turn", body: "How effectively turns convert into prestige over a full game." },
      { key: "netAssistValue", title: "Net Assist Value", body: "Net benefit from assist interactions after comparing received versus given." },
      { key: "synergyIndex", title: "Synergy Index", body: "Blended measure of teamwork, efficiency, and win alignment." },
    ],
  },
  {
    key: "pressure",
    title: "Pressure",
    subtitle: "How forcefully a player drives the table.",
    items: [
      { key: "failureRate", title: "Failure Rate", body: "Percentage of failed contract attempts." },
      { key: "contractFailureRatio", title: "Failure Ratio", body: "Failure pressure compared with total contract volume." },
      { key: "leadConversion", title: "Lead Conversion", body: "How often early leads turn into wins." },
      { key: "lateLeadConversion", title: "Late Lead Conversion", body: "How often late leads close out into wins." },
      { key: "objectiveConversionRate", title: "Objective Conversion", body: "Win rate when leading in objectives." },
      { key: "supportConversionRate", title: "Support Conversion", body: "Win rate when leading in assists or support volume." },
      { key: "aggroIndex", title: "Aggression", body: "How strongly a player pushes early leads and objective pressure." },
      { key: "interactionIndex", title: "Interaction", body: "Overall involvement via contracts, support lines, and active play." },
    ],
  },
  {
    key: "momentum",
    title: "Momentum",
    subtitle: "Form, consistency, and how the table is trending.",
    items: [
      { key: "consistencyScore", title: "Consistency", body: "How stable performance stays from game to game." },
      { key: "clutchScore", title: "Clutch", body: "Win rate in close games where finishing discipline matters most." },
      { key: "carryFactor", title: "Carry Factor", body: "How much of a player's prestige tends to be self-generated." },
      { key: "momentum", title: "Momentum", body: "Recent performance versus the long-term baseline." },
      { key: "tempoIndex", title: "Tempo", body: "Blend of efficiency, early pressure, and speed of value generation." },
      { key: "turnOrderWinCorrelation", title: "Seat vs Win Correlation", body: "How strongly seat order appears to influence winning outcomes." },
    ],
  },
];

export default function DefinitionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ metric?: string }>();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const targetMetric = String(params?.metric ?? "").trim();

  useEffect(() => {
    if (!targetMetric) return;

    const matchingGroup = DEFINITION_GROUPS.find((group) =>
      group.items.some((item) => item.key === targetMetric)
    );

    if (matchingGroup) {
      setActiveCategory(matchingGroup.key);
    }
  }, [targetMetric]);

  const visibleGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return DEFINITION_GROUPS.filter((group) => {
      if (activeCategory !== "all" && group.key !== activeCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return group.items.some(
        (item) =>
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.body.toLowerCase().includes(normalizedQuery) ||
          item.key.toLowerCase().includes(normalizedQuery)
      );
    }).map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!normalizedQuery) return true;
        return (
          item.title.toLowerCase().includes(normalizedQuery) ||
          item.body.toLowerCase().includes(normalizedQuery) ||
          item.key.toLowerCase().includes(normalizedQuery)
        );
      }),
    }));
  }, [activeCategory, query]);

  return (
    <PageShell preset="analytics">
      <SectionCard
        title="Definitions"
        subtitle="Search metrics or jump to a category so this page works like a reference, not a long flat glossary."
        actions={
          <Pressable
            style={styles.commandButton}
            onPress={() => router.push(APP_ROUTES.home)}
          >
            <Text style={styles.commandButtonText}>Back to Command</Text>
          </Pressable>
        }
      >
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search metrics or jump to a category"
          placeholderTextColor="#7D96B9"
          style={styles.searchInput}
        />

        <ScrollView
          horizontal
          contentContainerStyle={styles.categoryTabRail}
          showsHorizontalScrollIndicator={false}
        >
          <CategoryTab
            label="All"
            active={activeCategory === "all"}
            onPress={() => setActiveCategory("all")}
          />
          {DEFINITION_GROUPS.map((group) => (
            <CategoryTab
              key={group.key}
              label={group.title}
              active={activeCategory === group.key}
              onPress={() => setActiveCategory(group.key)}
            />
          ))}
        </ScrollView>
      </SectionCard>

      {visibleGroups.map((group) => (
        <SectionCard
          key={group.key}
          title={group.title}
          subtitle={group.subtitle}
        >
          <View style={styles.definitionList}>
            {group.items.map((item) => {
              const highlight = item.key === targetMetric;

              return (
                <View
                  key={item.key}
                  style={[styles.definitionCard, highlight && styles.definitionCardHighlight]}
                >
                  <Text style={styles.definitionTitle}>{item.title}</Text>
                  <Text style={styles.definitionBody}>{item.body}</Text>
                </View>
              );
            })}
          </View>
        </SectionCard>
      ))}
    </PageShell>
  );
}

function CategoryTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.categoryTab}>
      <Text style={[styles.categoryTabText, active && styles.categoryTabTextActive]}>
        {label}
      </Text>
      <View
        style={[
          styles.categoryTabUnderline,
          active && styles.categoryTabUnderlineActive,
        ]}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  commandButton: {
    minHeight: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.34)",
    backgroundColor: "rgba(37,99,235,0.16)",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  commandButtonText: {
    color: "#E8F1FF",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  searchInput: {
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.04)",
    color: "#F8FBFF",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "700",
  },
  categoryTabRail: {
    paddingTop: 2,
    paddingRight: 8,
    gap: 18,
    alignItems: "flex-end",
  },
  categoryTab: {
    minWidth: 72,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    gap: 6,
  },
  categoryTabText: {
    color: "#AFC3E8",
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.25,
    textAlign: "center",
  },
  categoryTabTextActive: {
    color: "#F8FBFF",
  },
  categoryTabUnderline: {
    width: "100%",
    minWidth: 44,
    height: 2,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  categoryTabUnderlineActive: {
    backgroundColor: "#67E8F9",
  },
  definitionList: {
    gap: 10,
  },
  definitionCard: {
    borderRadius: 16,
    padding: 14,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    gap: 6,
  },
  definitionCardHighlight: {
    backgroundColor: "rgba(96,165,250,0.12)",
    borderColor: "rgba(96,165,250,0.30)",
  },
  definitionTitle: {
    color: "#F8FBFF",
    fontSize: 15,
    fontWeight: "900",
  },
  definitionBody: {
    color: "#C7D6F3",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "600",
  },
});
