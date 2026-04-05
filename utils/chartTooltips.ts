import type { MetricTooltipRegistry } from './ChartInfoCard';

export const chartTooltips: MetricTooltipRegistry = {
  score: {
    label: 'Score',
    explanation: 'Score is the broadest output metric. It should reflect total value a player produced, regardless of whether that value came directly or through support.',
    meaning: 'Higher is better. Use score when you want the cleanest overall ranking before drilling into how that value was earned.',
    bullets: [
      'Use it for quick player ranking.',
      'Cross-check with direct and assist prestige to see how the score was built.',
      'A high score with low contracts may indicate strong support efficiency.',
    ],
    takeaway: 'Best for overall leaderboard-style comparison.',
  },
  totalPrestige: {
    label: 'Total Prestige',
    explanation: 'Total prestige combines the prestige a player earned directly with prestige they received through assists and other tracked prestige sources.',
    meaning: 'Higher is better. This is usually the clearest single prestige measure when you want total impact instead of only direct contract completion.',
    bullets: [
      'Good for comparing total influence on the game state.',
      'Use stacked or assist charts with this metric for context.',
    ],
    takeaway: 'Most complete prestige metric for broad comparison.',
  },
  directPrestige: {
    label: 'Direct Prestige',
    explanation: 'Direct prestige isolates prestige the player earned through their own direct actions rather than from support or shared outcomes.',
    meaning: 'Higher is better. This helps you separate primary execution from team enablement.',
    bullets: [
      'Great for identifying closers and primary earners.',
      'Compare with contracts to gauge direct efficiency.',
    ],
    takeaway: 'Best for measuring direct execution.',
  },
  assistPrestigeReceived: {
    label: 'Assist Prestige',
    explanation: 'Assist prestige tracks prestige credited through support relationships rather than direct completion.',
    meaning: 'Higher is better when you want to identify players who benefit most from cooperation or who convert support into value.',
    bullets: [
      'Useful alongside assist network charts.',
      'High values can indicate strong synergy-heavy play.',
    ],
    takeaway: 'Best for understanding supported value creation.',
  },
  assists: {
    label: 'Assists',
    explanation: 'Assists measure how often a player contributed to another player’s success in a tracked way.',
    meaning: 'Higher is usually better, but the count alone does not tell you how valuable the assists were. Pair it with assist prestige or assist efficiency.',
    bullets: [
      'Count metric, not quality metric.',
      'Good for identifying support-heavy roles.',
    ],
    takeaway: 'Use as a support activity volume metric.',
  },
  contracts: {
    label: 'Contracts',
    explanation: 'Contracts count how many tracked direct opportunities or completions a player took on.',
    meaning: 'Higher can mean more initiative, but not always better performance by itself. Pair it with direct prestige or efficiency.',
    bullets: [
      'High contracts with low direct prestige can signal inefficiency.',
      'High contracts plus high direct prestige usually signals strong carry play.',
    ],
    takeaway: 'Use as a workload and initiative metric.',
  },
  failures: {
    label: 'Failures',
    explanation: 'Failures capture unsuccessful attempts or turns that did not convert into the intended outcome.',
    meaning: 'Lower is better. This is usually best read with score, contracts, or efficiency so you do not punish high-volume players unfairly.',
    bullets: [
      'High failures can be acceptable if paired with high output.',
      'Use rates, not raw counts, when player workloads differ a lot.',
    ],
    takeaway: 'Best as a risk-cost or missed-conversion metric.',
  },
  turnsAtBase: {
    label: 'Turns At Base',
    explanation: 'Turns at base measure how often a player stayed back instead of contracting, assisting, or otherwise advancing.',
    meaning: 'Lower is usually better when you want active contribution, but context matters because defensive or reset turns may still be strategically correct.',
    bullets: [
      'Important for passivity analysis.',
      'Best compared on a per-turn basis when game lengths vary.',
    ],
    takeaway: 'Use to spot inactivity, resets, or conservative play.',
  },
  efficiency: {
    label: 'Efficiency',
    explanation: 'Efficiency estimates value produced relative to the number of opportunities, turns, or attempts used to produce it.',
    meaning: 'Higher is better. Efficiency should be read carefully when sample size is small.',
    bullets: [
      'Best after applying a minimum sample threshold.',
      'Use alongside raw totals so small samples do not mislead.',
    ],
    takeaway: 'Best for comparing quality of output, not total output.',
  },
  assistedEfficiency: {
    label: 'Assisted Efficiency',
    explanation: 'Assisted efficiency estimates how much supported value a player generates relative to their assist volume or support opportunities.',
    meaning: 'Higher is better. It helps separate frequent low-value assists from fewer high-impact assists.',
    bullets: [
      'Useful when assist counts alone flatten player differences.',
      'Compare with assist prestige for fuller support analysis.',
    ],
    takeaway: 'Best for comparing support quality, not just support volume.',
  },
};

export function getChartTooltip(metricKey?: string) {
  if (!metricKey) return undefined;
  return chartTooltips[metricKey];
}
