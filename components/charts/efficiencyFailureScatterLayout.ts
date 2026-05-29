export type EfficiencyFailureScatterLayout = {
  width: number;
  height: number;
  padLeft: number;
  padRight: number;
  padTop: number;
  padBottom: number;
  innerWidth: number;
  innerHeight: number;
};

type LabelPlacementArgs = {
  pointX: number;
  pointY: number;
  chartWidth: number;
  padLeft: number;
  padRight: number;
};

const DEFAULT_CHART_WIDTH = 320;
const DEFAULT_CHART_HEIGHT = 244;

export function buildEfficiencyFailureScatterLayout(
  containerWidth: number,
): EfficiencyFailureScatterLayout {
  const width =
    Number.isFinite(containerWidth) && containerWidth > 0
      ? Math.round(containerWidth)
      : DEFAULT_CHART_WIDTH;
  const height = Math.round(
    Math.max(224, Math.min(260, width * 0.76 || DEFAULT_CHART_HEIGHT)),
  );
  const padLeft = Math.max(34, Math.min(42, Math.round(width * 0.115)));
  const padRight = Math.max(18, Math.min(30, Math.round(width * 0.08)));
  const padTop = 20;
  const padBottom = 32;

  return {
    width,
    height,
    padLeft,
    padRight,
    padTop,
    padBottom,
    innerWidth: Math.max(120, width - padLeft - padRight),
    innerHeight: Math.max(120, height - padTop - padBottom),
  };
}

export function resolveEfficiencyFailureScatterLabelPlacement({
  pointX,
  pointY,
  chartWidth,
  padLeft,
  padRight,
}: LabelPlacementArgs): {
  x: number;
  y: number;
  textAnchor: "start" | "middle" | "end";
} {
  const leftGuard = padLeft + 28;
  const rightGuard = chartWidth - padRight - 28;

  if (pointX >= rightGuard) {
    return {
      x: chartWidth - padRight - 4,
      y: pointY - 10,
      textAnchor: "end",
    };
  }

  if (pointX <= leftGuard) {
    return {
      x: padLeft + 4,
      y: pointY - 10,
      textAnchor: "start",
    };
  }

  return {
    x: pointX,
    y: pointY - 10,
    textAnchor: "middle",
  };
}
