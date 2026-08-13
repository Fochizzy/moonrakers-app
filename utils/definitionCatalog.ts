export type DefinitionItem = {
  key: string;
  title: string;
  body: string;
};

export type DefinitionGroup = {
  key: string;
  title: string;
  subtitle: string;
  items: DefinitionItem[];
};

function compareDefinitionTitles(left: string, right: string) {
  return left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

function sortDefinitionItems(items: DefinitionItem[]) {
  return [...items].sort((left, right) =>
    compareDefinitionTitles(left.title, right.title)
  );
}

const RAW_DEFINITION_GROUPS: DefinitionGroup[] = [
  {
    key: "scoring",
    title: "Scoring",
    subtitle: "Raw production, board totals, and game results.",
    items: [
      {
        key: "totalPrestige",
        title: "Total Prestige",
        body: "All prestige earned across direct plays, assists, and objectives. Some screens shorten this to Prestige.",
      },
      {
        key: "directPrestige",
        title: "Direct Prestige",
        body: "Prestige earned from your own successful actions rather than incoming assist value.",
      },
      {
        key: "assistPrestigeReceived",
        title: "Assist Prestige Received",
        body: "Prestige gained because other players helped your lines. Some screens shorten this to Assist Received or Assist In.",
      },
      {
        key: "assistPrestigeSent",
        title: "Assist Prestige Sent",
        body: "Prestige value you pushed outward to the table by helping other players. Some screens shorten this to Assist Sent or Assist Out.",
      },
      {
        key: "score",
        title: "Score",
        body: "Score does not outrank total prestige in the final result. The game ranks by total prestige first, then uses score as a tiebreak. It also has a lighter influence on ELO: wins stay primary, while the non-prestige part of score gives each rated result a smaller nudge. Score is calculated as:\n- Total Prestige: +1 score per prestige\n- Contract Success: +5 score per contract\n- Assist: +3 score per assist given\n- Failure: -4 score per failure\n- Head-to-Head Mission bonus: add any linked mission score bonus",
      },
      {
        key: "wins",
        title: "Wins",
        body: "Total victories in the current sample.",
      },
      {
        key: "games",
        title: "Games Played",
        body: "Total games in the current sample. Read this first to judge how trustworthy the other numbers are.",
      },
      {
        key: "winRate",
        title: "Win Rate",
        body: "Wins divided by games played. Higher means the player converts tracked games into wins more often.",
      },
      {
        key: "avgPrestigePerGame",
        title: "Prestige / Game",
        body: "Average total prestige generated per game.",
      },
      {
        key: "avgScorePerGame",
        title: "Score / Game",
        body: "Average score produced per game.",
      },
      {
        key: "objectiveShareOfPrestige",
        title: "Objective Share",
        body: "The portion of a player's total prestige that came from objectives.",
      },
      {
        key: "objectivesPerGame",
        title: "Objectives / Game",
        body: "Average objective output per game.",
      },
      {
        key: "bestPrestigeMargin",
        title: "Best Prestige Margin",
        body: "The strongest positive prestige gap the player has posted in a tracked game.",
      },
      {
        key: "avgPrestigeMarginPerGame",
        title: "Average Prestige Margin / Game",
        body: "Average prestige lead or deficit per game. Positive values mean the player usually finishes ahead of the field.",
      },
    ],
  },
  {
    key: "efficiency",
    title: "Efficiency",
    subtitle: "How cleanly actions turn into value.",
    items: [
      {
        key: "efficiency",
        title: "Efficiency",
        body: "General shorthand for how much value a player gets from the actions, turns, or opportunities they use.",
      },
      {
        key: "allContractsEfficiency",
        title: "Overall Efficiency",
        body: "Combined prestige efficiency across direct and assisted production. Older surfaces may shorten this to All Eff.",
      },
      {
        key: "assistanceEfficiency",
        title: "Assist Efficiency",
        body: "Support-weighted efficiency based on how much value assists produce when they are involved.",
      },
      {
        key: "assistEfficiency",
        title: "Assist Efficiency",
        body: "Assist prestige received per assist action. Higher means support chances are turning into more value.",
      },
      {
        key: "assistedEfficiency",
        title: "Assisted Efficiency",
        body: "Alias form of assist efficiency used on some charts and comparison surfaces.",
      },
      {
        key: "directEfficiency",
        title: "Direct Efficiency",
        body: "Direct prestige produced per contract or direct scoring attempt.",
      },
      {
        key: "prestigePerTurn",
        title: "Prestige / Turn",
        body: "How effectively turns convert into prestige over a full game.",
      },
      {
        key: "netAssistValue",
        title: "Net Assist Value",
        body: "The net benefit created by assist interactions after comparing support received with support sent.",
      },
      {
        key: "assistShare",
        title: "Assist Share",
        body: "The percentage of a player's prestige that came from incoming assists.",
      },
      {
        key: "assistInPerGame",
        title: "Assist In / Game",
        body: "Average assist prestige received per game.",
      },
      {
        key: "contractFailureRatio",
        title: "Contracts / Failures Ratio",
        body: "Successful contract volume relative to failures. Higher usually means cleaner execution.",
      },
      {
        key: "synergyIndex",
        title: "Synergy Index",
        body: "A blended chemistry signal that weighs teamwork, efficiency, and win alignment.",
      },
    ],
  },
  {
    key: "support",
    title: "Assist Context",
    subtitle: "How support timing relates to the board state.",
    items: [
      {
        key: "supportContext",
        title: "Support Context",
        body: "A section-level shorthand for support-timing reads, spotlight cards, and support-state context that explain when assist value tends to appear.",
      },
      {
        key: "assistGapToTarget",
        title: "Assist Gap to Target",
        body: "Average prestige difference between you and the player you helped immediately before each tracked assist.",
      },
      {
        key: "assistGapToLeader",
        title: "Assist Gap to Leader",
        body: "Average prestige difference between you and the current prestige leader immediately before each tracked assist.",
      },
      {
        key: "assistsAtSixPlus",
        title: "Assists at 6+ Prestige",
        body: "Share and count of your tracked assists that happened when you already had at least 6 prestige.",
      },
      {
        key: "assistsOverFiveBehindLeader",
        title: "Assists Over 5 Behind Leader",
        body: "Share and count of your tracked assists that happened while you were more than 5 prestige behind the current leader.",
      },
      {
        key: "assistPrestigeGained",
        title: "Assist Prestige Gained",
        body: "Total prestige you earned by helping on other players' turns. Legacy imports infer this from saved assist source totals when round timing is missing.",
      },
    ],
  },
  {
    key: "pressure",
    title: "Pressure",
    subtitle: "How a player handles lead states, close games, and active table pressure.",
    items: [
      {
        key: "pressureContext",
        title: "Pressure & Context",
        body: "A section-level shorthand for pressure reads that mix closing, lead conversion, and surrounding game context into one view.",
      },
      {
        key: "failureRate",
        title: "Failure Rate",
        body: "The share of attempts that ended in failure. Lower is usually better.",
      },
      {
        key: "closeGames",
        title: "Close Games",
        body: "The number of tracked games that stayed tight enough to count as pressure situations.",
      },
      {
        key: "closeGameRate",
        title: "Close Game Rate",
        body: "The share of a player's games that stayed close.",
      },
      {
        key: "leadConversion",
        title: "Lead Conversion",
        body: "How often early leads turn into wins.",
      },
      {
        key: "lateLeadConversion",
        title: "Late Lead Conversion",
        body: "How often late leads close out into wins.",
      },
      {
        key: "objectiveConversionRate",
        title: "Objective Conversion",
        body: "Win rate when leading in objectives or objective pressure.",
      },
      {
        key: "supportConversionRate",
        title: "Support Conversion",
        body: "Win rate when leading in assists or support volume.",
      },
      {
        key: "aggroIndex",
        title: "Aggro Index",
        body: "A composite aggression signal built from early pressure, late pressure, and objective pressure. Some screens shorten this to Aggro or Aggression.",
      },
      {
        key: "interactionIndex",
        title: "Interaction Index",
        body: "A composite signal for how involved a player is through contracts, assists, and active table play. Some screens shorten this to Interaction.",
      },
      {
        key: "pressureReliability",
        title: "Pressure Reliability",
        body: "Estimated stability in close or pressure-heavy games. Higher means the player tends to stay effective when games tighten up.",
      },
    ],
  },
  {
    key: "momentum",
    title: "Momentum",
    subtitle: "Trend, tempo, and non-ELO directional reads.",
    items: [
      {
        key: "formClosing",
        title: "Form & Closing",
        body: "A section-level shorthand that pairs recent-form movement with closing and lead-conversion discipline.",
      },
      {
        key: "consistencyScore",
        title: "Consistency Score",
        body: "How stable performance stays from game to game. Some screens shorten this to Consistency.",
      },
      {
        key: "clutchScore",
        title: "Clutch Score",
        body: "Win rate in close or decisive games where finishing discipline matters most. Some screens shorten this to Clutch.",
      },
      {
        key: "carryFactor",
        title: "Carry Factor",
        body: "How much of a player's prestige tends to be self-generated rather than support-driven.",
      },
      {
        key: "momentum",
        title: "Momentum",
        body: "Recent performance versus a longer-run baseline.",
      },
      {
        key: "recentFormDelta",
        title: "Recent Form Delta",
        body: "The gap between recent output and long-run output. Positive means the player is running hotter lately.",
      },
      {
        key: "tempoIndex",
        title: "Tempo",
        body: "A blend of efficiency, early pressure, and speed of value generation.",
      },
      {
        key: "tempoControl",
        title: "Tempo Control",
        body: "Estimated ability to dictate the pace of value generation and game flow.",
      },
      {
        key: "defenseDenialScore",
        title: "Defense Denial Score",
        body: "Estimated ability to suppress opposing production or deny clean value windows.",
      },
      {
        key: "antiStyleMatchupScore",
        title: "Anti-Style Matchup Score",
        body: "Estimated effectiveness into opposing playstyles or archetypes.",
      },
      {
        key: "metaImpactScore",
        title: "Meta Impact Score",
        body: "Composite read for how strongly a player shapes the broader environment around them.",
      },
    ],
  },
  {
    key: "turnOrder",
    title: "Turn Order",
    subtitle: "Seat order, table-size splits, and how starting position relates to outcomes.",
    items: [
      {
        key: "turnOrderOverview",
        title: "Turn Order Overview",
        body: "The top-level turn-order surface that summarizes how each starting seat has performed across the tracked sample.",
      },
      {
        key: "turnOrderByTableSize",
        title: "By Table Size",
        body: "A turn-order split that re-checks seat performance inside each tracked table size instead of blending all seat data together.",
      },
      {
        key: "avgStartSeat",
        title: "Average Start Seat",
        body: "The player's average recorded starting seat across the sample.",
      },
      {
        key: "seatWinRate",
        title: "Seat Win Rate",
        body: "How often a specific starting seat converts appearances into wins across the active sample.",
      },
      {
        key: "turnOrderWinCorrelation",
        title: "Seat Advantage Spread",
        body: "The gap between the best and worst performing starting seat: the best seat's win rate minus the worst seat's. A negative value means earlier seats win more often, positive means later seats do, and 0 means every seat performs the same or too few seats have enough games yet. Seats need at least 3 appearances to count. This replaced an older Seat to Win Correlation, which could only detect a steady trend across seat numbers and read as 0 whenever one middle seat underperformed the rest.",
      },
    ],
  },
  {
    key: "projection",
    title: "Projection",
    subtitle: "Forward-looking estimates about where performance is headed.",
    items: [
      {
        key: "trajectoryGrade",
        title: "Trajectory Grade",
        body: "A forward-looking trend grade based on recent improvement and slope. Higher means the player is trending upward.",
      },
      {
        key: "futurePeakEstimate",
        title: "Future Peak Estimate",
        body: "Projected future ceiling if the current trend keeps holding.",
      },
      {
        key: "projectionScore",
        title: "Projection Score",
        body: "An overall forward-looking outlook that blends trend, confidence, and distance from peak.",
      },
      {
        key: "peakGapProj",
        title: "Distance From Peak",
        body: "How far the current profile sits below its peak rating. Lower is stronger here.",
      },
      {
        key: "recentLift",
        title: "Recent Lift",
        body: "Average late-sample ELO gain, used as a quick read on recent upward push.",
      },
      {
        key: "ceilingPressure",
        title: "Ceiling Pressure",
        body: "How much room still exists beneath the player's peak or ceiling. Lower means the player is already near that ceiling.",
      },
      {
        key: "trendSlope",
        title: "Trend Slope",
        body: "Recent pace compared with overall pace. Positive means the short-run trend is outperforming the full sample.",
      },
      {
        key: "breakoutChance",
        title: "Breakout Chance",
        body: "Estimated probability of an upward move if recent form and confidence keep holding.",
      },
      {
        key: "floorStrength",
        title: "Floor Strength",
        body: "How resistant the profile looks to downside or collapse.",
      },
      {
        key: "promotionOdds",
        title: "Promotion Odds",
        body: "Estimated chance that the current rating and trend push the player over the next tier threshold.",
      },
    ],
  },
  {
    key: "elo",
    title: "ELO",
    subtitle: "Rating terms, matchup context, and rating-movement reads.",
    items: [
      {
        key: "elo_current",
        title: "Current ELO",
        body: "The live rating used for leaderboard ordering and current strength reads. Each player starts at 1000. After every recorded game, the app computes an expected win chance against the field from the rating gaps, then updates rating with round(current + 32 * (actual - expected)). In that formula, actual starts at 1 for a win, 0 for a loss, and 0.5 if no winner is recorded, then gets a smaller bonus-score adjustment based on score excluding raw prestige.",
      },
      {
        key: "elo_peak",
        title: "Peak ELO",
        body: "The highest tracked rating reached in the current sample.",
      },
      {
        key: "elo_confidence",
        title: "Confidence",
        body: "A trust signal for how much sample support sits behind an ELO read. Higher means the rating has more games behind it.",
      },
      {
        key: "ratedGames",
        title: "Rated Games",
        body: "Saved games that qualify for the ELO model. This can be narrower than total games played.",
      },
      {
        key: "record",
        title: "Record",
        body: "Wins and losses inside the current ELO-filtered sample.",
      },
      {
        key: "avgDelta",
        title: "Avg ELO Delta",
        body: "Average rating movement per rated game.",
      },
      {
        key: "deltaVariance",
        title: "Delta Variance",
        body: "How swingy ELO changes are from game to game.",
      },
      {
        key: "formScore",
        title: "Form Score",
        body: "Short-run performance index built from recent rating movement and results.",
      },
      {
        key: "elo_change_last_5",
        title: "Last 5",
        body: "Total ELO movement across the last five rated games.",
      },
      {
        key: "elo_change_last_10",
        title: "Last 10",
        body: "Total ELO movement across the last ten rated games.",
      },
      {
        key: "recentDelta5",
        title: "Last 5 Avg Delta",
        body: "Average ELO gain or loss across the last five rated games.",
      },
      {
        key: "recentDelta10",
        title: "Last 10 Avg Delta",
        body: "Average ELO gain or loss across the last ten rated games.",
      },
      {
        key: "wr3",
        title: "Last 3 Win Rate",
        body: "Win rate across the latest three rated games.",
      },
      {
        key: "wr5",
        title: "Last 5 Win Rate",
        body: "Win rate across the latest five rated games.",
      },
      {
        key: "wr10",
        title: "Last 10 Win Rate",
        body: "Win rate across the latest ten rated games.",
      },
      {
        key: "elo_rolling_win_rate_10",
        title: "Win Rate (10)",
        body: "The registry form of rolling ten-game win rate used by ELO metric sections.",
      },
      {
        key: "elo_momentum",
        title: "ELO Momentum",
        body: "Rating trend slope across the sample. Higher means ELO is trending upward faster.",
      },
      {
        key: "currentStreak",
        title: "Current Streak",
        body: "The player's current run of wins or losses.",
      },
      {
        key: "bestStreak",
        title: "Best Win Streak",
        body: "The longest consecutive win run in the sample.",
      },
      {
        key: "positiveDeltaRate",
        title: "Positive Delta Rate",
        body: "The share of rated games that ended with a positive ELO change.",
      },
      {
        key: "skillScore",
        title: "Skill Score",
        body: "A strength index that tries to reward repeatable quality rather than only short-run form.",
      },
      {
        key: "favoredWinRate",
        title: "Favored Win Rate",
        body: "Win rate in games where the player entered with the stronger rating position.",
      },
      {
        key: "underdogWinRate",
        title: "Underdog Win Rate",
        body: "Win rate in games where the player entered as the lower-rated side.",
      },
      {
        key: "avgOpponentElo",
        title: "Avg Opponent ELO",
        body: "Average rating of the opposition in the current sample.",
      },
      {
        key: "bestSingleGain",
        title: "Best Single Gain",
        body: "The biggest one-game positive rating jump in the sample.",
      },
      {
        key: "worstSingleDrop",
        title: "Worst Single Drop",
        body: "The biggest one-game negative rating drop in the sample.",
      },
      {
        key: "baselineEdge",
        title: "Baseline Edge",
        body: "Difference between the player's current ELO and the field's average ELO. Positive means playing above room average.",
      },
      {
        key: "highOppRate",
        title: "Vs Equal+ ELO",
        body: "Win rate against equal-or-better average opposition.",
      },
      {
        key: "headToHeadWinRate",
        title: "Head-to-Head Win Rate",
        body: "Win rate against the currently selected opponent or matchup filter.",
      },
      {
        key: "opponentRange",
        title: "Opponent Range",
        body: "Spread between the weakest and strongest average opponent ratings in the sample.",
      },
      {
        key: "oppositionGap",
        title: "Opposition Gap",
        body: "Average pre-game rating edge or deficit versus the field.",
      },
      {
        key: "contextAvgDelta",
        title: "Context Avg Delta",
        body: "Average ELO gain or loss inside the active matchup or context filter.",
      },
      {
        key: "contextStability",
        title: "Context Stability",
        body: "How steady rating outcomes stay once the sample is filtered to a specific context.",
      },
      {
        key: "toughMatchShare",
        title: "Tough Match Share",
        body: "The share of rated games played against equal-or-better average opposition.",
      },
      {
        key: "strengthOfSchedule",
        title: "Strength of Schedule",
        body: "Average quality of opposition, usually measured through opponent ELO.",
      },
      {
        key: "contextConfidence",
        title: "Context Confidence",
        body: "How trustworthy a matchup or filtered split is based on the amount of supporting data.",
      },
      {
        key: "elo_expected_vs_actual",
        title: "Expected vs Actual",
        body: "Difference between what the ELO model expected to happen and what the player actually converted into wins.",
      },
      {
        key: "elo_clutch",
        title: "ELO Clutch",
        body: "Rating gain tied to converted wins, used as an ELO-flavored finishing signal.",
      },
      {
        key: "elo_upset_rate",
        title: "ELO Upset Rate",
        body: "How often the player wins as the lower-rated side in ELO-based reads.",
      },
      {
        key: "elo_h2h_trend",
        title: "H2H Trend",
        body: "Rating trend against a selected opponent across their shared games.",
      },
      {
        key: "elo_h2h_last_5",
        title: "H2H Last 5",
        body: "Total ELO movement across the last five head-to-head games with the selected opponent.",
      },
      {
        key: "elo_h2h_recent_win_rate",
        title: "H2H Win Rate",
        body: "Recent win rate against the selected opponent.",
      },
      {
        key: "elo_expected_win_prob",
        title: "Expected Win %",
        body: "Model-based win probability from the current rating gap.",
      },
      {
        key: "elo_projection_5",
        title: "Projection (5)",
        body: "A short extrapolation of current rating using recent movement over the next five games.",
      },
      {
        key: "elo_projection_10",
        title: "Projection (10)",
        body: "A longer extrapolation of current rating using recent movement over the next ten games.",
      },
      {
        key: "tierStabilityScore",
        title: "Tier Stability",
        body: "How securely the player appears to sit in their current rating band.",
      },
      {
        key: "upsetRate",
        title: "Upset Rate",
        body: "Share of underdog situations that still become wins.",
      },
      {
        key: "recoveryRate",
        title: "Recovery Rate",
        body: "How often the player rebounds after a downturn window or slump.",
      },
      {
        key: "conversionScore",
        title: "Lead Conversion",
        body: "How often ELO-favored positions or rating edges are converted into wins.",
      },
      {
        key: "vsHigherRatedWinRate",
        title: "Vs Higher Rated",
        body: "Win rate against stronger-rated opposition.",
      },
    ],
  },
  {
    key: "correlations",
    title: "Correlations",
    subtitle: "Relationship-based signals across players, lineups, and tendencies.",
    items: [
      {
        key: "pairingCorrelations",
        title: "Personal Correlations",
        body: "Player-specific relationship clues showing which metrics tend to rise or fall with that player's outcomes.",
      },
      {
        key: "macroCorrelations",
        title: "Macro Correlations",
        body: "Broad field-level correlations that describe what tends to matter across the whole sample.",
      },
      {
        key: "topSynergyPairs",
        title: "Top Synergy Pairs",
        body: "The strongest two-player chemistry signals in the current dataset.",
      },
      {
        key: "correlationFeed",
        title: "Correlation Feed",
        body: "A ranked stream of server-authored relationship reads, not a single raw metric.",
      },
      {
        key: "topSignals",
        title: "Top Signals",
        body: "The most important quick-hit takeaways surfaced from the current analytics payload.",
      },
      {
        key: "cohesionAffect",
        title: "Cohesion Affect",
        body: "How well a selected lineup or group appears to fit together once comparison metrics are aggregated.",
      },
      {
        key: "conditionalAffect",
        title: "Conditional Affect",
        body: "How results shift when a specific player, group, or lineup condition is true.",
      },
      {
        key: "dataConfidence",
        title: "Data Confidence",
        body: "How trustworthy a comparison or conditional read is based on sample size and data coverage.",
      },
    ],
  },
  {
    key: "intel",
    title: "Moonrakers Intel",
    subtitle: "Player-profile reads that summarize patterns beyond raw totals.",
    items: [
      {
        key: "baseTurnsPerGame",
        title: "Base Turns / Game",
        body: "Average number of turns per game where the player stayed at base.",
      },
      {
        key: "baseRate",
        title: "Base Rate",
        body: "Share of playable turns spent staying at base.",
      },
      {
        key: "styleRead",
        title: "Style Read",
        body: "A simple label showing whether direct prestige, support prestige, or objective output stands furthest ahead. Common results are Direct, Support, Objective, or Balanced.",
      },
      {
        key: "supportStyle",
        title: "Support Style",
        body: "A quick read of whether the player acts more like a Giver, Receiver, or Balanced support profile.",
      },
      {
        key: "finisher",
        title: "Finisher",
        body: "How strongly a player's good positions turn into actual prestige and wins. High finisher profiles cash in when the table gives them a window instead of leaving value stranded.",
      },
      {
        key: "starter",
        title: "Starter",
        body: "How reliably a player gets into strong positions early. High starter profiles create tempo, initiative, or board footing before the table fully settles.",
      },
      {
        key: "supporter",
        title: "Supporter",
        body: "How much a player's game creates value for teammates through assists, enabling lines, or table support. High supporter profiles lift surrounding players even when they are not finishing the points themselves.",
      },
      {
        key: "receiver",
        title: "Receiver",
        body: "How well a player turns incoming help into personal value. High receiver profiles are especially good at converting team support into prestige, tempo, or stronger finishing positions.",
      },
      {
        key: "stability",
        title: "Stability",
        body: "How repeatable the player's outcomes stay across different games, tables, and pressure states. High stability profiles preserve their identity without swinging wildly from matchup to matchup.",
      },
      {
        key: "bestCondition",
        title: "Best Condition",
        body: "The strongest supported split for this player, based on tracked sample, win rate, and average prestige.",
      },
      {
        key: "worstCondition",
        title: "Worst Condition",
        body: "The weakest supported split for this player, based on tracked sample, win rate, and average prestige.",
      },
      {
        key: "bestSupportPartner",
        title: "Best Support Partner",
        body: "The tablemate whose shared sample currently produces the best support-driven results.",
      },
      {
        key: "mostCommonAssistTarget",
        title: "Most Common Assist Target",
        body: "The teammate this player helps most often in tracked assist data.",
      },
      {
        key: "importHealth",
        title: "Import Health",
        body: "How complete the assist-context data is for this player. It distinguishes exact assist timing from partial or inferred assist reconstruction.",
      },
      {
        key: "playstyle",
        title: "Playstyle",
        body: "The archetype label assigned from a player's mix of pace, support, efficiency, stability, and finishing.",
      },
      {
        key: "dependency",
        title: "Dependency",
        body: "How much a player's output appears to rely on incoming support or assisted value.",
      },
      {
        key: "aggressor",
        title: "Aggressor",
        body: "A playstyle that starts fast, pushes contracts, and forces the pace through self-generated output.",
      },
      {
        key: "supportEngine",
        title: "Support Engine",
        body: "A playstyle that creates value for others, feeds assists, and amplifies synergy across the table.",
      },
      {
        key: "risk",
        title: "Risk",
        body: "How willing the profile is to take volatile lines, absorb instability, or trade steadiness for upside. High risk profiles often create sharper swings in both ceiling and floor.",
      },
      {
        key: "conversion",
        title: "Conversion",
        body: "How often opportunities become actual results. High conversion profiles close the loop from setup to payoff instead of leaving strong positions unfinished.",
      },
      {
        key: "opportunist",
        title: "Opportunist",
        body: "A playstyle that wins through timing, efficiency, and capitalizing on strong windows instead of forcing pace every turn.",
      },
      {
        key: "closer",
        title: "Closer",
        body: "A playstyle that does its best work late and converts decisive moments at a high rate.",
      },
    ],
  },
];

export const DEFINITION_GROUPS: DefinitionGroup[] = RAW_DEFINITION_GROUPS.map(
  (group) => ({
    ...group,
    items: sortDefinitionItems(group.items),
  })
);

export const RELATED_DEFINITION_KEYS: Record<string, string[]> = {
  elo_current: ["elo_peak", "elo_confidence", "elo_expected_vs_actual", "elo_momentum"],
  elo_peak: ["elo_current", "trajectoryGrade", "promotionOdds", "elo_momentum"],
  elo_confidence: ["ratedGames", "contextConfidence", "dataConfidence", "elo_current"],
  turnOrderOverview: ["turnOrderByTableSize", "avgStartSeat", "seatWinRate", "turnOrderWinCorrelation"],
  turnOrderByTableSize: ["turnOrderOverview", "seatWinRate", "avgStartSeat", "turnOrderWinCorrelation"],
  seatWinRate: ["turnOrderOverview", "turnOrderByTableSize", "avgStartSeat", "turnOrderWinCorrelation"],
  pairingCorrelations: ["macroCorrelations", "topSynergyPairs", "dataConfidence", "synergyIndex"],
  macroCorrelations: ["pairingCorrelations", "topSynergyPairs", "cohesionAffect", "conditionalAffect"],
  topSynergyPairs: ["pairingCorrelations", "synergyIndex", "cohesionAffect", "bestSupportPartner"],
  playstyle: ["baseRate", "baseTurnsPerGame", "styleRead", "supportStyle"],
  styleRead: ["playstyle", "baseRate", "baseTurnsPerGame", "supportStyle"],
  supportStyle: ["playstyle", "assistShare", "netAssistValue", "assistEfficiency"],
  finisher: ["conversion", "closer", "leadConversion", "lateLeadConversion"],
  starter: ["tempoIndex", "tempoControl", "aggroIndex", "leadConversion"],
  supporter: ["supportStyle", "supportEngine", "assistEfficiency", "bestSupportPartner"],
  receiver: ["supportStyle", "assistShare", "assistPrestigeReceived", "dependency"],
  stability: ["consistencyScore", "pressureReliability", "momentum", "clutchScore"],
  risk: ["aggroIndex", "failureRate", "tempoIndex", "pressureReliability"],
  conversion: ["finisher", "leadConversion", "lateLeadConversion", "objectiveConversionRate"],
  tempoControl: ["tempoIndex", "momentum", "recentFormDelta", "consistencyScore"],
  consistencyScore: ["clutchScore", "momentum", "recentFormDelta", "pressureReliability"],
  synergyIndex: ["topSynergyPairs", "pairingCorrelations", "cohesionAffect", "assistEfficiency"],
};

const GROUP_BY_KEY = new Map(DEFINITION_GROUPS.map((group) => [group.key, group]));
const ITEM_BY_KEY = new Map(DEFINITION_GROUPS.flatMap((group) => group.items.map((item) => [item.key, item])));
const GROUP_KEY_BY_ITEM_KEY = new Map(DEFINITION_GROUPS.flatMap((group) => group.items.map((item) => [item.key, group.key])));

function sortDefinitionKeysByTitle(keys: string[]) {
  return [...keys].sort((left, right) =>
    compareDefinitionTitles(
      ITEM_BY_KEY.get(left)?.title ?? left,
      ITEM_BY_KEY.get(right)?.title ?? right
    )
  );
}

export function getDefinitionGroup(groupKey: string | null | undefined) {
  const normalized = String(groupKey ?? '').trim();
  return normalized ? GROUP_BY_KEY.get(normalized) ?? null : null;
}

export function getDefinitionItem(itemKey: string | null | undefined) {
  const normalized = String(itemKey ?? '').trim();
  return normalized ? ITEM_BY_KEY.get(normalized) ?? null : null;
}

export function getDefinitionGroupKeyForItem(itemKey: string | null | undefined) {
  const normalized = String(itemKey ?? '').trim();
  return normalized ? GROUP_KEY_BY_ITEM_KEY.get(normalized) ?? null : null;
}

export function getDefinitionTerms() {
  return DEFINITION_GROUPS.flatMap((group) => [
    { label: group.title, category: group.key, metric: null as string | null },
    ...group.items.map((item) => ({ label: item.title, category: group.key, metric: item.key })),
  ]);
}

export function getRelatedDefinitionKeys(itemKey: string | null | undefined, limit = 4) {
  const normalized = String(itemKey ?? '').trim();
  if (!normalized) {
    return [];
  }

  const explicit = (RELATED_DEFINITION_KEYS[normalized] ?? []).filter((key) =>
    ITEM_BY_KEY.has(key)
  );
  if (explicit.length > 0) {
    return sortDefinitionKeysByTitle(explicit).slice(0, limit);
  }

  const groupKey = GROUP_KEY_BY_ITEM_KEY.get(normalized);
  if (!groupKey) {
    return [];
  }

  const group = GROUP_BY_KEY.get(groupKey);
  if (!group) {
    return [];
  }

  return sortDefinitionItems(
    group.items.filter((item) => item.key !== normalized)
  )
    .slice(0, limit)
    .map((item) => item.key);
}

function isBoundaryCharacter(value: string | undefined) {
  return !value || /[^a-z0-9]/i.test(value);
}

export type DefinitionTextSegment =
  | { type: 'text'; text: string }
  | { type: 'term'; text: string; metric?: string | null; category?: string | null };

export function findDefinitionTextSegments(text: string) {
  const input = String(text ?? '');
  if (!input.trim()) {
    return [{ type: 'text', text: input }] as DefinitionTextSegment[];
  }

  const candidates = getDefinitionTerms()
    .map((entry) => ({ ...entry, normalized: entry.label.toLowerCase() }))
    .sort((left, right) => right.normalized.length - left.normalized.length);

  const lower = input.toLowerCase();
  const matches = [];

  for (const candidate of candidates) {
    let index = 0;
    while (index < lower.length) {
      const nextIndex = lower.indexOf(candidate.normalized, index);
      if (nextIndex === -1) {
        break;
      }

      const endIndex = nextIndex + candidate.normalized.length;
      const before = nextIndex > 0 ? input[nextIndex - 1] : undefined;
      const after = endIndex < input.length ? input[endIndex] : undefined;
      if (isBoundaryCharacter(before) && isBoundaryCharacter(after)) {
        matches.push({ start: nextIndex, end: endIndex, candidate });
      }

      index = nextIndex + candidate.normalized.length;
    }
  }

  matches.sort((left, right) => {
    if (left.start !== right.start) {
      return left.start - right.start;
    }
    return (right.end - right.start) - (left.end - left.start);
  });

  const accepted = [];
  let cursor = 0;
  for (const match of matches) {
    if (match.start < cursor) {
      continue;
    }
    accepted.push(match);
    cursor = match.end;
  }

  if (!accepted.length) {
    return [{ type: 'text', text: input }] as DefinitionTextSegment[];
  }

  const segments = [];
  let position = 0;
  for (const match of accepted) {
    if (match.start > position) {
      segments.push({ type: 'text', text: input.slice(position, match.start) });
    }
    segments.push({
      type: 'term',
      text: input.slice(match.start, match.end),
      metric: match.candidate.metric,
      category: match.candidate.category,
    });
    position = match.end;
  }

  if (position < input.length) {
    segments.push({ type: 'text', text: input.slice(position) });
  }

  return segments as DefinitionTextSegment[];
}
