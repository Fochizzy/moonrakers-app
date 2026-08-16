import { loadChartScreen } from "./loadChartScreen";

export async function loadCompareScreen(searchParams: {
  comparePlayerId?: string;
  focusPlayerId?: string;
}) {
  return loadChartScreen({
    chartKey: "compare",
    focusPlayerId: searchParams.focusPlayerId ?? null,
    comparePlayerId: searchParams.comparePlayerId ?? null,
  });
}
