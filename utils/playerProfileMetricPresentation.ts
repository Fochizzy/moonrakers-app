import { type EloMetricTab } from "@/utils/elo/metricRegistry";

export type PlayerProfileMetricPresentationCard = {
  key: string;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "accent" | "blue" | "green" | "red" | "danger";
};

export type PlayerProfileMetricPresentationInsight = {
  title: string;
  body: string;
};

type BuildPlayerProfileMetricPresentationArgs = {
  activeTab: EloMetricTab;
  activeInsight: PlayerProfileMetricPresentationInsight;
  profileInsight: PlayerProfileMetricPresentationInsight;
  sectionCards: PlayerProfileMetricPresentationCard[];
  topCards: PlayerProfileMetricPresentationCard[];
};

export type PlayerProfileMetricPresentation = {
  featuredCard: PlayerProfileMetricPresentationCard | null;
  insightBody: string;
  insightTitle: string;
  secondaryCards: PlayerProfileMetricPresentationCard[];
  secondaryInsightBody: string | null;
  sectionCards: PlayerProfileMetricPresentationCard[];
  signalsTitle: string;
};

export function buildPlayerProfileMetricPresentation({
  activeTab,
  activeInsight,
  profileInsight,
  sectionCards,
  topCards,
}: BuildPlayerProfileMetricPresentationArgs): PlayerProfileMetricPresentation {
  const useTabSectionSignals = activeTab !== "Leaderboard" && sectionCards.length > 0;
  const signalCards = useTabSectionSignals
    ? sectionCards
    : topCards.length > 0
      ? topCards
      : sectionCards;
  const featuredCard = signalCards[0] ?? null;
  const secondaryCards = signalCards.slice(1, 3);
  const sectionDetailCards =
    useTabSectionSignals && sectionCards.length > 3
      ? sectionCards.slice(3)
      : sectionCards;
  const primaryInsight = activeTab === "Leaderboard" ? profileInsight : activeInsight;
  const secondaryInsight = activeTab === "Leaderboard" ? activeInsight : profileInsight;
  const secondaryInsightBody =
    secondaryInsight.body && secondaryInsight.body !== primaryInsight.body
      ? secondaryInsight.body
      : null;

  return {
    signalsTitle:
      activeTab === "Leaderboard" ? "Top 3 Winning Signals" : `Top 3 ${activeTab} Signals`,
    featuredCard,
    secondaryCards,
    sectionCards: sectionDetailCards,
    insightTitle: primaryInsight.title,
    insightBody: primaryInsight.body,
    secondaryInsightBody,
  };
}
