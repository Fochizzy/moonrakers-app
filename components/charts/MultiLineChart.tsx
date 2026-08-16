import React, { memo } from "react";

import LineChart from "./LineChart";
import type { LineMode } from "./LineChart";

type ChartDatum = {
  round?: number;
  gameIndex?: number;
  label?: string;
  snapshot?: Record<string, unknown>;
};

type Player = {
  id: string;
  name: string;
  color?: string;
};

type Props = {
  data?: ChartDatum[];
  players?: Player[];
  statKey: string;
  scopedPlayerIds?: string[];
  title?: string;
  subtitle?: string;
  mode?: LineMode;
  onChangeMode?: (mode: LineMode) => void;
  showModeSelector?: boolean;
  showHeader?: boolean;
};

function MultiLineChart({
  data = [],
  players = [],
  statKey,
  scopedPlayerIds,
  title,
  subtitle,
  mode,
  onChangeMode,
  showModeSelector = false,
  showHeader = true,
}: Props) {
  return (
    <LineChart
      data={data}
      players={players}
      statKey={statKey}
      scopedPlayerIds={scopedPlayerIds}
      selectedPlayerIds={scopedPlayerIds}
      title={title}
      subtitle={subtitle || "Multi-player trend"}
      mode={mode}
      onChangeMode={onChangeMode}
      showModeSelector={showModeSelector}
      showHeader={showHeader}
    />
  );
}

export default memo(MultiLineChart);
