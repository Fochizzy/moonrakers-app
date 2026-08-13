type SeriesLabel = {
  color?: string;
  label: string;
};

export function formatChartValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString(undefined, {
        maximumFractionDigits: Number.isInteger(value) ? 0 : 1,
      })
    : "";
}

export function formatMetricLabel(value: string) {
  return value
    .replace(/[_-]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function ChartLabelStrip({
  series = [],
  xLabel,
  yLabel,
}: {
  series?: SeriesLabel[];
  xLabel: string;
  yLabel: string;
}) {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        flexWrap: "wrap",
        gap: "0.75rem 1rem",
        justifyContent: "space-between",
      }}
    >
      <div
        style={{
          color: "var(--sub)",
          display: "flex",
          flexWrap: "wrap",
          fontSize: "0.85rem",
          fontWeight: 800,
          gap: "0.45rem 0.9rem",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
        }}
      >
        <span>X: {xLabel}</span>
        <span>Y: {yLabel}</span>
      </div>

      {series.length > 0 ? (
        <div
          aria-label="Chart series"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          {series.map((entry) => (
            <span
              key={entry.label}
              style={{
                alignItems: "center",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                borderRadius: "999px",
                color: "var(--text-strong)",
                display: "inline-flex",
                fontSize: "0.85rem",
                fontWeight: 800,
                gap: "0.45rem",
                padding: "0.35rem 0.65rem",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  background: entry.color ?? "var(--blue)",
                  borderRadius: "999px",
                  height: "0.65rem",
                  width: "0.65rem",
                }}
              />
              {entry.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
