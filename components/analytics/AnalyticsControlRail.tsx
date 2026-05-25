import React from "react";
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";

import PlayerSearchPicker, {
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
  emptyText?: string;
  helperText?: string | null;
  hideResults?: boolean;
  inactiveLabel?: string;
  items: PlayerSearchPickerItem[];
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
  tabs = [],
  title,
}: AnalyticsControlRailProps) {
  return (
    <SectionCard title={title} subtitle={subtitle} actions={actions} style={style}>
      {tabs.length ? (
        <View style={styles.tabRail}>
          {tabs.map((tab) => {
            const active = tab.key === activeTabKey;
            return (
              <Pressable
                key={tab.key}
                onPress={onTabChange ? () => onTabChange(tab.key) : undefined}
                style={styles.tabButton}
              >
                <Text
                  numberOfLines={1}
                  style={[styles.tabButtonText, active && styles.tabButtonTextActive]}
                >
                  {tab.label}
                </Text>
                <View
                  style={[
                    styles.tabButtonUnderline,
                    active && styles.tabButtonUnderlineActive,
                  ]}
                />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {search ? (
        <PlayerSearchPicker
          activeLabel={search.activeLabel}
          emptyText={search.emptyText}
          helperText={search.helperText}
          hideResults={search.hideResults}
          inactiveLabel={search.inactiveLabel}
          items={search.items}
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
  tabButtonText: {
    color: "#AFC3E8",
    fontSize: 11,
    fontWeight: "800",
    textAlign: "center",
    letterSpacing: 0.15,
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
