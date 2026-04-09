import type { EloGameRecord } from "./eloTransforms";
import {
  getTop3WinningSignalsEngineV2,
  type MetricContext,
} from "./metricRegistry";

export function getWinningSignals(
  rows: EloGameRecord[],
  allRows?: EloGameRecord[],
  context?: MetricContext
) {
  return getTop3WinningSignalsEngineV2(rows, allRows, context);
}
