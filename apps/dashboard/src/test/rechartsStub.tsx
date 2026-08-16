/**
 * Recharts measures its container to decide what to draw, and jsdom reports
 * every element as zero-sized, so the real library renders nothing under test.
 * Tests that care about a renderer's own output — not recharts' — swap in this
 * stub, which keeps children mounted so assertions can reach them.
 */

type StubProps = { children?: React.ReactNode };

function passthrough(testId: string) {
  const Component = ({ children }: StubProps) => (
    <div data-testid={testId}>{children}</div>
  );
  Component.displayName = `RechartsStub(${testId})`;
  return Component;
}

function leaf(testId: string) {
  const Component = () => <div data-testid={testId} />;
  Component.displayName = `RechartsStub(${testId})`;
  return Component;
}

export const rechartsStub = {
  Bar: passthrough("bar"),
  BarChart: passthrough("bar-chart"),
  CartesianGrid: leaf("cartesian-grid"),
  Label: () => null,
  LabelList: () => null,
  Legend: leaf("legend"),
  Line: passthrough("line"),
  LineChart: passthrough("line-chart"),
  PolarAngleAxis: leaf("polar-angle-axis"),
  PolarGrid: leaf("polar-grid"),
  PolarRadiusAxis: leaf("polar-radius-axis"),
  Radar: passthrough("radar"),
  RadarChart: passthrough("radar-chart"),
  ResponsiveContainer: passthrough("responsive-container"),
  Scatter: passthrough("scatter"),
  ScatterChart: passthrough("scatter-chart"),
  Tooltip: leaf("chart-tooltip"),
  XAxis: passthrough("x-axis"),
  YAxis: passthrough("y-axis"),
};
