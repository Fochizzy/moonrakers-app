import { SCORE_WEIGHTS } from './constants';

export function computeScore(stat: any) {
  return (
    (stat.prestige ?? 0) * SCORE_WEIGHTS.prestige +
    (stat.contracts ?? 0) * SCORE_WEIGHTS.contracts +
    (stat.assists ?? 0) * SCORE_WEIGHTS.assists +
    (stat.failures ?? 0) * SCORE_WEIGHTS.failures
  );
}
