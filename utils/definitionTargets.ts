export type DefinitionTargetInput = {
  category?: string | null;
  label?: string | null;
  metric?: string | null;
};

export type DefinitionTarget = {
  category?: string | null;
  metric?: string | null;
};

const DEFINITION_CATEGORY_KEYS = new Set([
  "scoring",
  "efficiency",
  "support",
  "pressure",
  "momentum",
  "turnOrder",
  "projection",
  "elo",
  "correlations",
  "intel",
]);

const DEFINITION_CATEGORY_LABEL_ALIASES: Record<string, string> = {
  scoring: "scoring",
  efficiency: "efficiency",
  "assist context": "support",
  support: "support",
  pressure: "pressure",
  momentum: "momentum",
  "turn order": "turnOrder",
  projection: "projection",
  elo: "elo",
  correlations: "correlations",
  "moonrakers intel": "intel",
};

const DEFINITION_METRIC_KEYS = new Set([
  "totalPrestige",
  "directPrestige",
  "assistPrestigeReceived",
  "assistPrestigeSent",
  "score",
  "wins",
  "games",
  "winRate",
  "avgPrestigePerGame",
  "avgScorePerGame",
  "objectiveShareOfPrestige",
  "objectivesPerGame",
  "bestPrestigeMargin",
  "avgPrestigeMarginPerGame",
  "efficiency",
  "allContractsEfficiency",
  "assistanceEfficiency",
  "assistEfficiency",
  "assistedEfficiency",
  "directEfficiency",
  "prestigePerTurn",
  "netAssistValue",
  "assistShare",
  "assistInPerGame",
  "contractFailureRatio",
  "synergyIndex",
  "assistGapToTarget",
  "assistGapToLeader",
  "assistsAtSixPlus",
  "assistsOverFiveBehindLeader",
  "assistPrestigeGained",
  "failureRate",
  "closeGames",
  "closeGameRate",
  "leadConversion",
  "lateLeadConversion",
  "objectiveConversionRate",
  "supportConversionRate",
  "aggroIndex",
  "interactionIndex",
  "pressureReliability",
  "consistencyScore",
  "clutchScore",
  "carryFactor",
  "momentum",
  "recentFormDelta",
  "tempoIndex",
  "tempoControl",
  "formClosing",
  "pressureContext",
  "supportContext",
  "turnOrderOverview",
  "turnOrderByTableSize",
  "avgStartSeat",
  "seatWinRate",
  "turnOrderWinCorrelation",
  "defenseDenialScore",
  "antiStyleMatchupScore",
  "metaImpactScore",
  "trajectoryGrade",
  "futurePeakEstimate",
  "projectionScore",
  "peakGapProj",
  "recentLift",
  "ceilingPressure",
  "trendSlope",
  "breakoutChance",
  "floorStrength",
  "promotionOdds",
  "elo_current",
  "elo_peak",
  "elo_confidence",
  "ratedGames",
  "record",
  "avgDelta",
  "deltaVariance",
  "formScore",
  "elo_change_last_5",
  "elo_change_last_10",
  "recentDelta5",
  "recentDelta10",
  "wr3",
  "wr5",
  "wr10",
  "elo_rolling_win_rate_10",
  "elo_momentum",
  "currentStreak",
  "bestStreak",
  "positiveDeltaRate",
  "skillScore",
  "favoredWinRate",
  "underdogWinRate",
  "avgOpponentElo",
  "bestSingleGain",
  "worstSingleDrop",
  "baselineEdge",
  "highOppRate",
  "headToHeadWinRate",
  "opponentRange",
  "oppositionGap",
  "contextAvgDelta",
  "contextStability",
  "toughMatchShare",
  "strengthOfSchedule",
  "contextConfidence",
  "elo_expected_vs_actual",
  "elo_clutch",
  "elo_upset_rate",
  "elo_h2h_trend",
  "elo_h2h_last_5",
  "elo_h2h_recent_win_rate",
  "elo_expected_win_prob",
  "elo_projection_5",
  "elo_projection_10",
  "tierStabilityScore",
  "upsetRate",
  "recoveryRate",
  "conversionScore",
  "vsHigherRatedWinRate",
  "pairingCorrelations",
  "macroCorrelations",
  "topSynergyPairs",
  "correlationFeed",
  "topSignals",
  "cohesionAffect",
  "conditionalAffect",
  "dataConfidence",
  "baseTurnsPerGame",
  "baseRate",
  "styleRead",
  "supportStyle",
  "bestCondition",
  "worstCondition",
  "bestSupportPartner",
  "mostCommonAssistTarget",
  "importHealth",
  "playstyle",
  "dependency",
  "aggressor",
  "supportEngine",
  "opportunist",
  "closer",
]);

const DEFINITION_METRIC_ALIASES: Record<string, string> = {
  avgPrestigeMargin: "avgPrestigeMarginPerGame",
  avgStartOrder: "avgStartSeat",
  dataConfidenceScore: "dataConfidence",
  prestige: "totalPrestige",
};

const DEFINITION_LABEL_ALIASES: Record<string, string> = {
  "aggro index": "aggroIndex",
  aggressor: "aggressor",
  "all eff": "allContractsEfficiency",
  "assist eff": "assistEfficiency",
  "assist efficiency": "assistEfficiency",
  "avg prestige margin": "avgPrestigeMarginPerGame",
  "avg prestige": "avgPrestigePerGame",
  "avg start order": "avgStartSeat",
  "average start seat": "avgStartSeat",
  "assist prestige in": "assistPrestigeReceived",
  "assist prestige out": "assistPrestigeSent",
  "base rate": "baseRate",
  "base turns / game": "baseTurnsPerGame",
  "best condition": "bestCondition",
  "best support partner": "bestSupportPartner",
  closer: "closer",
  "close game rate": "closeGameRate",
  "close-game rate": "closeGameRate",
  "cohesion affect": "cohesionAffect",
  confidence: "elo_confidence",
  "consistency score": "consistencyScore",
  "contract / failure ratio": "contractFailureRatio",
  "contracts / failures ratio": "contractFailureRatio",
  "current elo": "elo_current",
  "current streak": "currentStreak",
  "data confidence": "dataConfidence",
  dependency: "dependency",
  "direct eff": "directEfficiency",
  "direct efficiency": "directEfficiency",
  "direct prestige": "directPrestige",
  "elo clutch": "elo_clutch",
  "elo momentum": "elo_momentum",
  "elo peak": "elo_peak",
  "elo upset rate": "elo_upset_rate",
  "expected vs actual": "elo_expected_vs_actual",
  "failure rate": "failureRate",
  "favored win rate": "favoredWinRate",
  games: "games",
  "games played": "games",
  "head to head win rate": "headToHeadWinRate",
  "import health": "importHealth",
  "interaction index": "interactionIndex",
  "last 10": "elo_change_last_10",
  "last 10 avg delta": "recentDelta10",
  "last 10 win rate": "wr10",
  "last 3 win rate": "wr3",
  "last 5": "elo_change_last_5",
  "last 5 avg delta": "recentDelta5",
  "last 5 win rate": "wr5",
  "macro correlations": "macroCorrelations",
  "most common assist target": "mostCommonAssistTarget",
  opportunist: "opportunist",
  "objective share": "objectiveShareOfPrestige",
  "overall efficiency": "allContractsEfficiency",
  peak: "elo_peak",
  "peak elo": "elo_peak",
  "personal correlations": "pairingCorrelations",
  playstyle: "playstyle",
  "positive delta rate": "positiveDeltaRate",
  prestige: "totalPrestige",
  "prestige / game": "avgPrestigePerGame",
  "prestige / turn": "prestigePerTurn",
  "projection score": "projectionScore",
  "promotion odds": "promotionOdds",
  "pressure context": "pressureContext",
  record: "record",
  "recovery rate": "recoveryRate",
  "score / game": "avgScorePerGame",
  score: "score",
  "seat vs win correlation": "turnOrderWinCorrelation",
  "seat win rate": "seatWinRate",
  "seat to win correlation": "turnOrderWinCorrelation",
  "skill score": "skillScore",
  "strength of schedule": "strengthOfSchedule",
  "support context": "supportContext",
  "support context spotlight": "supportContext",
  "support engine": "supportEngine",
  "support style": "supportStyle",
  "synergy index": "synergyIndex",
  "tempo control": "tempoControl",
  "top signals": "topSignals",
  "top synergy pairs": "topSynergyPairs",
  "turn order overview": "turnOrderOverview",
  "turn order win correlation": "turnOrderWinCorrelation",
  "by table size": "turnOrderByTableSize",
  "trajectory grade": "trajectoryGrade",
  "total prestige": "totalPrestige",
  "underdog win rate": "underdogWinRate",
  "win rate": "winRate",
  wins: "wins",
  "worst condition": "worstCondition",
  "form closing": "formClosing",
};

function normalizeLookup(value: string | null | undefined): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[+]/g, " plus ")
    .replace(/[\/]/g, " / ")
    .replace(/[^a-z0-9/ ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveDefinitionMetric(metric?: string | null, label?: string | null) {
  const normalizedMetric = String(metric ?? "").trim();

  if (normalizedMetric) {
    const aliasedMetric =
      DEFINITION_METRIC_ALIASES[normalizedMetric] ?? normalizedMetric;
    if (DEFINITION_METRIC_KEYS.has(aliasedMetric)) {
      return aliasedMetric;
    }
  }

  const normalizedLabel = normalizeLookup(label);
  if (!normalizedLabel) {
    return null;
  }

  const aliasedLabelMetric = DEFINITION_LABEL_ALIASES[normalizedLabel];
  if (aliasedLabelMetric && DEFINITION_METRIC_KEYS.has(aliasedLabelMetric)) {
    return aliasedLabelMetric;
  }

  return null;
}

function resolveDefinitionCategory(
  category?: string | null,
  label?: string | null,
) {
  const normalizedCategory = String(category ?? "").trim();
  if (DEFINITION_CATEGORY_KEYS.has(normalizedCategory)) {
    return normalizedCategory;
  }

  const normalizedLabel = normalizeLookup(label);
  if (!normalizedLabel) {
    return null;
  }

  const aliasedCategory = DEFINITION_CATEGORY_LABEL_ALIASES[normalizedLabel];
  if (aliasedCategory && DEFINITION_CATEGORY_KEYS.has(aliasedCategory)) {
    return aliasedCategory;
  }

  return null;
}

export function resolveDefinitionTarget(
  input: DefinitionTargetInput,
): DefinitionTarget | null {
  const metric = resolveDefinitionMetric(input.metric, input.label);
  const resolvedCategory = resolveDefinitionCategory(
    input.category,
    input.label,
  );

  if (!metric && !resolvedCategory) {
    return null;
  }

  return {
    ...(metric ? { metric } : {}),
    ...(resolvedCategory ? { category: resolvedCategory } : {}),
  };
}

export function hasDefinitionTarget(input: DefinitionTargetInput): boolean {
  return resolveDefinitionTarget(input) !== null;
}
