import React from "react";
import { StyleSheet, View } from "react-native";

import DefinitionTermText from "@/components/ui/DefinitionTermText";
import Text from "@/components/ui/Text";
import { COLORS } from "@/utils/colors";
import { toDisplayValue, toNumberValue, toStringValue } from "@/utils/numbers";

type PayloadRecord = Record<string, unknown>;

type TurnOrderSummarySectionProps = {
  overviewRows: PayloadRecord[];
  tableSizeGroups: PayloadRecord[];
};

function formatWinRate(value: unknown) {
  const numericValue = toNumberValue(value, Number.NaN);
  if (!Number.isFinite(numericValue)) {
    return "--";
  }

  return `${Math.round(numericValue * 100)}%`;
}

function formatCorrelation(value: unknown) {
  const numericValue = toNumberValue(value, Number.NaN);
  if (!Number.isFinite(numericValue)) {
    return "--";
  }

  return numericValue.toFixed(2);
}

function formatAvgPrestige(value: unknown) {
  const numericValue = toNumberValue(value, Number.NaN);
  if (!Number.isFinite(numericValue)) {
    return "--";
  }

  return Number.isInteger(numericValue) ? String(numericValue) : numericValue.toFixed(1);
}

function TurnOrderRowCard({ row }: { row: PayloadRecord }) {
  const appearances = toDisplayValue(row.appearances);
  const wins = toDisplayValue(row.wins);
  const correlation = toNumberValue(row.correlation, Number.NaN);

  return (
    <View style={styles.rowCard}>
      <View style={styles.rowHeader}>
        <DefinitionTermText
          label={toStringValue(row.label, `Seat ${toDisplayValue(row.seat)}`)}
          style={styles.rowTitle}
        />
        <Text style={styles.rowMeta}>{appearances} appearances</Text>
      </View>

      <View style={styles.metricStrip}>
        <View style={styles.metricPill}>
          <Text style={styles.metricLabel}>Wins</Text>
          <Text style={styles.metricValue}>{wins}</Text>
        </View>
        <View style={styles.metricPill}>
          <Text style={styles.metricLabel}>Win rate</Text>
          <Text style={styles.metricValue}>{formatWinRate(row.winRate)}</Text>
        </View>
        <View style={styles.metricPill}>
          <Text style={styles.metricLabel}>Avg prestige</Text>
          <Text style={styles.metricValue}>{formatAvgPrestige(row.avgPrestige)}</Text>
        </View>
      </View>

      {Number.isFinite(correlation) ? (
        <Text style={styles.rowCaption}>
          Seat-to-win correlation: {formatCorrelation(correlation)}
        </Text>
      ) : null}
    </View>
  );
}

export default function TurnOrderSummarySection({
  overviewRows,
  tableSizeGroups,
}: TurnOrderSummarySectionProps) {
  if (!overviewRows.length && !tableSizeGroups.length) {
    return null;
  }

  return (
    <View style={styles.sectionList}>
      {overviewRows.length > 0 ? (
        <View style={styles.sectionCard}>
          <DefinitionTermText label="Turn Order Overview" style={styles.sectionTitle} />
          <Text style={styles.sectionSummary}>
            Server-authored seat lanes across your finished games.
          </Text>
          <View style={styles.rowList}>
            {overviewRows.map((row, index) => (
              <TurnOrderRowCard
                key={toStringValue(row.key ?? row.label, `turn-order-overview-${index}`)}
                row={row}
              />
            ))}
          </View>
        </View>
      ) : null}

      {tableSizeGroups.length > 0 ? (
        <View style={styles.sectionCard}>
          <DefinitionTermText label="By Table Size" style={styles.sectionTitle} />
          <Text style={styles.sectionSummary}>
            Turn-order performance split by the table sizes Supabase tracked for you.
          </Text>
          <View style={styles.groupList}>
            {tableSizeGroups.map((group, index) => {
              const rows = Array.isArray(group.rows)
                ? group.rows.filter(
                    (row): row is PayloadRecord =>
                      Boolean(row) && typeof row === "object" && !Array.isArray(row),
                  )
                : [];

              return (
                <View
                  key={toStringValue(group.label, `turn-order-group-${index}`)}
                  style={styles.groupCard}
                >
                  <DefinitionTermText
                    label={toStringValue(group.label, `Table ${index + 1}`)}
                    style={styles.groupTitle}
                  />
                  {toStringValue(group.summary, "") ? (
                    <Text style={styles.groupSummary}>{toStringValue(group.summary, "")}</Text>
                  ) : null}
                  <View style={styles.rowList}>
                    {rows.map((row, rowIndex) => (
                      <TurnOrderRowCard
                        key={toStringValue(row.key ?? row.label, `turn-order-row-${rowIndex}`)}
                        row={row}
                      />
                    ))}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionList: {
    gap: 8,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSoft,
    backgroundColor: "rgba(12,21,36,0.94)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: "900",
  },
  sectionSummary: {
    color: COLORS.textSecondary,
    fontSize: 11,
    lineHeight: 17,
  },
  groupList: {
    gap: 8,
  },
  groupCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
  },
  groupTitle: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: "900",
  },
  groupSummary: {
    color: COLORS.textMuted,
    fontSize: 10,
    lineHeight: 16,
  },
  rowList: {
    gap: 6,
  },
  rowCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(148,163,184,0.18)",
    backgroundColor: "rgba(4,8,20,0.72)",
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 6,
  },
  rowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  rowTitle: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: "900",
  },
  rowMeta: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: "700",
  },
  metricStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metricPill: {
    minWidth: 74,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(103,232,249,0.18)",
    backgroundColor: "rgba(103,232,249,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 6,
    gap: 2,
  },
  metricLabel: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.35,
  },
  metricValue: {
    color: COLORS.textPrimary,
    fontSize: 11,
    fontWeight: "900",
  },
  rowCaption: {
    color: COLORS.textSecondary,
    fontSize: 10,
    lineHeight: 15,
  },
});
