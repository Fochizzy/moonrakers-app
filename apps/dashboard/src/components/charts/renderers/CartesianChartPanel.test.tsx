import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rechartsProps = vi.hoisted(() => ({
  line: [] as Array<Record<string, unknown>>,
  scatter: [] as Array<Record<string, unknown>>,
  xAxis: [] as Array<Record<string, unknown>>,
  yAxis: [] as Array<Record<string, unknown>>,
}));

vi.mock("recharts", () => ({
  Bar: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  BarChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Label: () => null,
  LabelList: () => null,
  Line: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  } & Record<string, unknown>) => {
    rechartsProps.line.push(props);
    return <div>{children}</div>;
  },
  LineChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  ResponsiveContainer: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  Scatter: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  } & Record<string, unknown>) => {
    rechartsProps.scatter.push(props);
    return <div>{children}</div>;
  },
  ScatterChart: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Tooltip: () => <div data-testid="chart-tooltip" />,
  XAxis: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  } & Record<string, unknown>) => {
    rechartsProps.xAxis.push(props);
    return <div>{children}</div>;
  },
  YAxis: ({
    children,
    ...props
  }: {
    children?: React.ReactNode;
  } & Record<string, unknown>) => {
    rechartsProps.yAxis.push(props);
    return <div>{children}</div>;
  },
}));

import { CartesianChartPanel } from "./CartesianChartPanel";

describe("CartesianChartPanel", () => {
  beforeEach(() => {
    rechartsProps.line.length = 0;
    rechartsProps.scatter.length = 0;
    rechartsProps.xAxis.length = 0;
    rechartsProps.yAxis.length = 0;
  });

  it("renders the efficiency vs failure scatter with explicit failures and efficiency axes", () => {
    render(
      <CartesianChartPanel
        chartKey="efficiency_failure_scatter"
        payload={{
          title: "Efficiency vs Failure",
          subtitle: "Average efficiency versus failures across tracked games.",
          data: {
            data: [
              {
                label: "RevLoki",
                efficiency: 5.6,
                failures: 0.4,
              },
              {
                label: "Greg",
                efficiency: 3.9,
                failures: 1.2,
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getByText("X: Failures")).toBeInTheDocument();
    expect(screen.getByText("Y: Efficiency")).toBeInTheDocument();
    expect(rechartsProps.xAxis).toEqual([
      expect.objectContaining({
        dataKey: "failures",
        type: "number",
        name: "Failures",
      }),
    ]);
    expect(rechartsProps.yAxis).toEqual([
      expect.objectContaining({
        dataKey: "efficiency",
        type: "number",
        name: "Efficiency",
      }),
    ]);
    expect(rechartsProps.scatter).toEqual([
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            label: "RevLoki",
            efficiency: 5.6,
            failures: 0.4,
          }),
          expect.objectContaining({
            label: "Greg",
            efficiency: 3.9,
            failures: 1.2,
          }),
        ]),
        name: "Efficiency",
      }),
    ]);
    expect(
      typeof (rechartsProps.xAxis[0] as { tickFormatter?: unknown }).tickFormatter,
    ).toBe("function");
    expect(
      typeof (rechartsProps.yAxis[0] as { tickFormatter?: unknown }).tickFormatter,
    ).toBe("function");
  });

  it("renders bump charts against rank instead of coercing game labels into the metric axis", () => {
    render(
      <CartesianChartPanel
        chartKey="bump_chart"
        payload={{
          title: "Bump Chart",
          subtitle: "Rank by game for the selected metric.",
          data: {
            data: [
              { label: "Game 1", rank: 3 },
              { label: "Game 2", rank: 1 },
            ],
          },
        }}
      />,
    );

    expect(screen.getByText("X: Game or Row")).toBeInTheDocument();
    expect(screen.getByText("Y: Rank")).toBeInTheDocument();
    expect(rechartsProps.line).toEqual([
      expect.objectContaining({
        dataKey: "rank",
        name: "Rank",
      }),
    ]);
  });
});
