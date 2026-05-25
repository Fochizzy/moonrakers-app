import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import Text from "@/components/ui/Text";
import { COLORS } from "@/utils/colors";

export type PlayerSearchPickerItem = {
  id: string;
  label: string;
  meta?: string | null;
};

type PlayerSearchPickerProps = {
  activeLabel?: string;
  emptyText?: string;
  helperText?: string | null;
  hideResults?: boolean;
  inactiveLabel?: string;
  items: PlayerSearchPickerItem[];
  nestedScrollEnabled?: boolean;
  onQueryChange: (value: string) => void;
  onSelect: (id: string) => void;
  placeholder: string;
  query: string;
  selectedIds: string[];
  selectionMode?: "single" | "multiple";
  showResultsOnlyWhenQuery?: boolean;
  variant?: "list" | "rail";
};

export default function PlayerSearchPicker({
  activeLabel = "Selected",
  emptyText = "No players match that search yet.",
  helperText = null,
  hideResults = false,
  inactiveLabel = "View",
  items,
  nestedScrollEnabled = false,
  onQueryChange,
  onSelect,
  placeholder,
  query,
  selectedIds,
  selectionMode = "single",
  showResultsOnlyWhenQuery = false,
  variant = "list",
}: PlayerSearchPickerProps) {
  const shouldRenderResults = !showResultsOnlyWhenQuery || query.trim().length > 0;

  return (
    <View style={styles.container}>
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
      <TextInput
        value={query}
        onChangeText={onQueryChange}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textMuted}
        style={styles.searchInput}
        autoCapitalize="words"
        autoCorrect={false}
      />

      {!hideResults && shouldRenderResults ? (
        items.length > 0 ? (
          variant === "rail" ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.rail}
            >
              {items.map((item) => {
                const active = selectedIds.includes(item.id);
                return (
                  <Pressable
                    key={item.id}
                    style={[
                      styles.railItem,
                      active && styles.railItemActive,
                    ]}
                    onPress={() => onSelect(item.id)}
                  >
                    <Text
                      style={[
                        styles.railLabel,
                        active && styles.railLabelActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                    <View
                      style={[
                        styles.railUnderline,
                        active && styles.railUnderlineActive,
                      ]}
                    />
                  </Pressable>
                );
              })}
            </ScrollView>
          ) : (
            <ScrollView
              style={styles.list}
              nestedScrollEnabled={nestedScrollEnabled}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.listContent}>
                {items.map((item) => {
                  const active = selectedIds.includes(item.id);
                  return (
                    <Pressable
                      key={item.id}
                      style={[
                        styles.listItem,
                        active && styles.listItemActive,
                      ]}
                      onPress={() => onSelect(item.id)}
                    >
                      <View style={styles.listCopy}>
                        <Text style={styles.listLabel}>{item.label}</Text>
                        {item.meta ? (
                          <Text style={styles.listMeta}>{item.meta}</Text>
                        ) : null}
                      </View>
                      <Text style={styles.listAction}>
                        {active
                          ? activeLabel
                          : selectionMode === "multiple"
                            ? inactiveLabel.replace("View", "Add")
                            : inactiveLabel}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          )
        ) : (
          <Text style={styles.emptyText}>{emptyText}</Text>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  helperText: {
    color: COLORS.sub,
    fontSize: 11,
    lineHeight: 16,
  },
  searchInput: {
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.whiteSoft,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 12,
    fontWeight: "700",
  },
  rail: {
    gap: 8,
    paddingRight: 8,
    alignItems: "center",
  },
  railItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  railItemActive: {
    borderColor: COLORS.accent,
  },
  railLabel: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "700",
  },
  railLabelActive: {
    color: COLORS.accent,
  },
  railUnderline: {
    marginTop: 4,
    height: 2,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  railUnderlineActive: {
    backgroundColor: COLORS.accent,
  },
  list: {
    maxHeight: 280,
  },
  listContent: {
    gap: 8,
  },
  listItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  listItemActive: {
    borderColor: COLORS.accent,
    backgroundColor: COLORS.accentSoft,
  },
  listCopy: {
    flex: 1,
    gap: 4,
  },
  listLabel: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
  listMeta: {
    color: COLORS.sub,
    fontSize: 10,
    lineHeight: 14,
  },
  listAction: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "800",
  },
  emptyText: {
    color: COLORS.sub,
    fontSize: 11,
  },
});
