import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ChartRenderer } from "./ChartRenderer";

describe("ChartRenderer", () => {
  it("routes compare datasets into the comparison renderer family", () => {
    render(
      <ChartRenderer
        chartKey="compare"
        payload={{
          chartKey: "compare",
          generatedAt: "2026-07-04T03:00:00.000Z",
          title: "Compare players",
          data: { rows: [] },
        }}
      />,
    );

    expect(screen.getByText("Comparison Family")).toBeInTheDocument();
  });

  it("renders visible labels for comparison chart axes and series using the active metric", () => {
    render(
      <ChartRenderer
        chartKey="compare"
        payload={{
          chartKey: "compare",
          generatedAt: "2026-07-06T03:00:00.000Z",
          title: "Compare players",
          data: {
            rows: [
              { label: "Game 1", focusValue: 9, compareValue: 11 },
              { label: "Game 2", focusValue: 12, compareValue: 15 },
            ],
            metricKey: "failures",
            primaryLabel: "Fochizzy",
            comparisonLabel: "Corey",
          },
        }}
      />,
    );

    expect(screen.getByText("X: Shared Game")).toBeInTheDocument();
    expect(screen.getByText("Y: Failures")).toBeInTheDocument();
    expect(screen.getByText("Fochizzy")).toBeInTheDocument();
    expect(screen.getByText("Corey")).toBeInTheDocument();
  });

  it("routes sparkline datasets into the sparkline renderer family", () => {
    render(
      <ChartRenderer
        chartKey="sparkline"
        payload={{
          chartKey: "sparkline",
          generatedAt: "2026-07-06T03:00:00.000Z",
          title: "Sparkline",
          data: {
            data: [
              { label: "Game 1", assistEfficiency: 2 },
              { label: "Game 2", assistEfficiency: 4 },
            ],
            comparisonData: [
              { label: "Game 1", assistEfficiency: 1 },
              { label: "Game 2", assistEfficiency: 3 },
            ],
            metricKey: "assistEfficiency",
            primaryLabel: "Fochizzy",
            comparisonLabel: "Corey",
          },
        }}
      />,
    );

    expect(screen.getByText("Sparkline Family")).toBeInTheDocument();
    expect(screen.getByText("X: Game")).toBeInTheDocument();
    expect(screen.getByText("Y: Assist Efficiency")).toBeInTheDocument();
    expect(screen.queryByText("Comparison Family")).not.toBeInTheDocument();
  });

  it("routes radar datasets into a polar radar profile", () => {
    render(
      <ChartRenderer
        chartKey="radar"
        payload={{
          chartKey: "radar",
          generatedAt: "2026-07-06T03:00:00.000Z",
          title: "Radar",
          data: {
            rows: [
              { label: "Finisher", focusValue: 0.7, compareValue: 0.4 },
              { label: "Starter", focusValue: 0.5, compareValue: 0.6 },
              { label: "Supporter", focusValue: 0.3, compareValue: 0.8 },
              { label: "Receiver", focusValue: 0.6, compareValue: 0.4 },
            ],
          },
        }}
      />,
    );

    expect(screen.getByText("Radar Profile")).toBeInTheDocument();
    expect(screen.queryByText("Comparison Family")).not.toBeInTheDocument();
  });

  it("routes line-chart datasets into the line-history renderer family", () => {
    render(
      <ChartRenderer
        chartKey="line_chart"
        payload={{
          chartKey: "line_chart",
          generatedAt: "2026-07-06T03:00:00.000Z",
          title: "Line Chart",
          data: {
            data: [
              {
                label: "Game 1",
                snapshot: {
                  "focus-player": {
                    score: 12,
                    playerName: "Fochizzy",
                  },
                  "rival-player": {
                    score: 9,
                    playerName: "Corey",
                  },
                },
              },
              {
                label: "Game 2",
                snapshot: {
                  "focus-player": {
                    score: 16,
                    playerName: "Fochizzy",
                  },
                  "rival-player": {
                    score: 11,
                    playerName: "Corey",
                  },
                },
              },
            ],
            players: [
              { id: "focus-player", name: "Fochizzy", color: "#3B82F6" },
              { id: "rival-player", name: "Corey", color: "#A855F7" },
            ],
            statKey: "score",
            selectedPlayerIds: ["focus-player", "rival-player"],
            mode: "average",
          },
        }}
      />,
    );

    expect(screen.getByText("Line History")).toBeInTheDocument();
    expect(screen.queryByText("Chart Family")).not.toBeInTheDocument();
  });

  it("routes elo datasets into the elo trend renderer family", () => {
    render(
      <ChartRenderer
        chartKey="elo"
        payload={{
          chartKey: "elo",
          generatedAt: "2026-07-06T03:00:00.000Z",
          title: "Elo trend",
          data: {
            data: [
              { label: "Game 1", elo: 1000, compareElo: 1018 },
              { label: "Game 2", elo: 1024, compareElo: 997 },
            ],
          },
        }}
      />,
    );

    expect(screen.getByText("Elo Trend")).toBeInTheDocument();
    expect(screen.queryByText("Cartesian Family")).not.toBeInTheDocument();
  });

  it("renders relationship graphs as a node-link assist network", () => {
    render(
      <ChartRenderer
        chartKey="relationship_graph"
        payload={{
          chartKey: "relationship_graph",
          generatedAt: "2026-07-06T03:00:00.000Z",
          title: "Assist Network",
          data: {
            players: [
              { id: "fochizzy", name: "Fochizzy", color: "#3B82F6" },
              { id: "greg", name: "GregMTG", color: "#14B8A6" },
              { id: "corey", name: "Corey", color: "#F59E0B" },
            ],
            relationships: [
              {
                id: "fochizzy-greg",
                from: "fochizzy",
                to: "greg",
                label: "Fochizzy → GregMTG",
                weight: 4,
              },
              {
                id: "greg-corey",
                from: "greg",
                to: "corey",
                label: "GregMTG -> Corey",
                weight: 2,
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getByText("Assist Flow Network")).toBeInTheDocument();
    expect(screen.getByLabelText("Assist network diagram")).toBeInTheDocument();
    expect(screen.getByText("Fochizzy")).toBeInTheDocument();
    expect(screen.getByText("GregMTG")).toBeInTheDocument();
    expect(screen.getByText("Corey")).toBeInTheDocument();
    expect(screen.getAllByText("Fochizzy → GregMTG")).toHaveLength(2);
    expect(screen.queryByText("Network Family")).not.toBeInTheDocument();
  });

  it("renders relationship graphs from assist-network edge payloads that use sourceId and assistCount fields", () => {
    render(
      <ChartRenderer
        chartKey="relationship_graph"
        payload={{
          chartKey: "relationship_graph",
          generatedAt: "2026-07-06T03:00:00.000Z",
          title: "Assist Network",
          data: {
            nodes: [
              { id: "fochizzy", label: "Fochizzy", color: "#3B82F6" },
              { id: "greg", label: "GregMTG", color: "#14B8A6" },
              { id: "corey", label: "Corey", color: "#F59E0B" },
            ],
            edges: [
              {
                id: "fochizzy__greg",
                sourceId: "fochizzy",
                targetId: "greg",
                assistCount: 4,
              },
              {
                id: "greg__corey",
                sourceId: "greg",
                targetId: "corey",
                assistPrestige: 2,
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getByLabelText("Assist network diagram")).toBeInTheDocument();
    expect(screen.getByText("Fochizzy")).toBeInTheDocument();
    expect(screen.getByText("GregMTG")).toBeInTheDocument();
    expect(screen.getByText("Corey")).toBeInTheDocument();
    expect(screen.getAllByText("Fochizzy → GregMTG")).toHaveLength(2);
  });

  it("renders relationship graphs from published links arrays", () => {
    render(
      <ChartRenderer
        chartKey="relationship_graph"
        payload={{
          chartKey: "relationship_graph",
          generatedAt: "2026-07-06T03:00:00.000Z",
          title: "Assist Network",
          data: {
            nodes: [
              { id: "fochizzy", label: "Fochizzy", color: "#3B82F6" },
              { id: "greg", label: "GregMTG", color: "#14B8A6" },
              { id: "corey", label: "Corey", color: "#F59E0B" },
            ],
            links: [
              {
                id: "fochizzy__greg",
                source: "fochizzy",
                target: "greg",
                value: 1.5,
                labelText: "1.5/game",
              },
              {
                id: "greg__corey",
                source: "greg",
                target: "corey",
                value: 0.8,
                labelText: "0.8/game",
              },
            ],
          },
        }}
      />,
    );

    expect(screen.getByLabelText("Assist network diagram")).toBeInTheDocument();
    expect(screen.getByText("Fochizzy")).toBeInTheDocument();
    expect(screen.getByText("GregMTG")).toBeInTheDocument();
    expect(screen.getByText("Corey")).toBeInTheDocument();
    expect(screen.getAllByText("Fochizzy → GregMTG")).toHaveLength(2);
  });
});
