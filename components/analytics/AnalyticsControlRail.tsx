import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

import PlayerSearchPicker, {
  type PlayerSearchPickerInputProps,
  type PlayerSearchPickerItem,
} from "@/components/players/PlayerSearchPicker";
import SectionCard from "@/components/ui/SectionCard";
import Text from "@/components/ui/Text";
import { COLORS } from "@/utils/colors";

export type AnalyticsControlRailTab = {
  key: string;
  label: string;
};

type AnalyticsControlRailSearch = {
  activeLabel?: string;
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
  clearLabel?: string;
  emptyText?: string;
  helperText?: string | null;
  hideResults?: boolean;
  inactiveLabel?: string;
  inputProps?: PlayerSearchPickerInputProps;
  items: PlayerSearchPickerItem[];
  onClearQuery?: () => void;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  placeholder: string;
  query: string;
  selectedIds: string[];
  selectionMode?: "single" | "multiple";
  showResultsOnlyWhenQuery?: boolean;
  variant?: "list" | "rail";
};

type AnalyticsControlRailProps = {
  actions?: React.ReactNode;
  activeTabKey?: string;
  onTabChange?: (key: string) => void;
  search?: AnalyticsControlRailSearch | null;
  style?: StyleProp<ViewStyle>;
  subtitle?: string;
  tabVariant?: "underline" | "stacked";
  tabs?: AnalyticsControlRailTab[];
  title?: string;
};

export default function AnalyticsControlRail({
  actions,
  activeTabKey,
  onTabChange,
  search = null,
  style,
  subtitle,
  tabVariant = "underline",
  tabs = [],
  title,
}: AnalyticsControlRailProps) {
  return (
    <SectionCard title={title} subtitle={subtitle} actions={actions} style={style}>
      {tabs.length ? (
        <View
          style={[
            styles.tabRail,
            tabVariant === "stacked" && styles.tabRailStacked,
          ]}
        >
          {tabs.map((tab) => {
            const active = tab.key === activeTabKey;
            return (
              <Pressable
                key={tab.key}
                onPress={onTabChange ? () => onTabChange(tab.key) : undefined}
                style={[
                  styles.tabButton,
                  tabVariant === "stacked" && styles.tabButtonStacked,
                  tabVariant === "stacked" &&
                    active &&
                    styles.tabButtonStackedActive,
                ]}
              >
                <Text
                  numberOfLines={tabVariant === "stacked" ? 3 : 1}
                  style={[
                    styles.tabButtonText,
                    active && styles.tabButtonTextActive,
                    tabVariant === "stacked" && styles.tabButtonTextStacked,
                  ]}
                >
                  {tab.label}
                </Text>
                {tabVariant === "underline" ? (
                  <View
                    style={[
                      styles.tabButtonUnderline,
                      active && styles.tabButtonUnderlineActive,
                    ]}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {search ? (
        <PlayerSearchPicker
          activeLabel={search.activeLabel}
          autoCapitalize={search.autoCapitalize ?? "words"}
          clearLabel={search.clearLabel}
          emptyText={search.emptyText}
          helperText={search.helperText}
          hideResults={search.hideResults}
          inactiveLabel={search.inactiveLabel}
          inputProps={search.inputProps}
          items={search.items}
          onClearQuery={search.onClearQuery}
          onQueryChange={search.onQueryChange}
          onSelect={search.onSelect}
          placeholder={search.placeholder}
          query={search.query}
          selectedIds={search.selectedIds}
          selectionMode={search.selectionMode}
          showResultsOnlyWhenQuery={search.showResultsOnlyWhenQuery}
          variant={search.variant}
        />
      ) : null}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  tabRail: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    gap: 8,
  },
  tabRailStacked: {
    flexDirection: "column",
    flexWrap: "nowrap",
    alignItems: "stretch",
    gap: 4,
  },
  tabButton: {
    minWidth: 0,
    flexGrow: 1,
    flexBasis: "30%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    paddingHorizontal: 4,
    gap: 6,
  },
  tabButtonStacked: {
    flexBasis: "auto",
    flexGrow: 0,
    alignSelf: "stretch",
    alignItems: "flex-start",
    justifyContent: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 3,
  },
  tabButtonStackedActive: {
    borderColor: COLORS.cyan,
    backgroundColor: COLORS.cardAlt,
  },
  tabButtonText: {
    color: "#AFC3E8",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.15,
  },
  tabButtonTextStacked: {
    width: "100%",
    fontSize: 13,
    textAlign: "left",
    lineHeight: 16,
    letterSpacing: 0.1,
  },
  tabButtonTextActive: {
    color: COLORS.textPrimary,
  },
  tabButtonUnderline: {
    width: "100%",
    minWidth: 40,
    height: 2,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  tabButtonUnderlineActive: {
    backgroundColor: COLORS.cyan,
  },
});
