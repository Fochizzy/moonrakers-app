import React from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import Text from "@/components/ui/Text";
import { COLORS } from "@/utils/colors";

export type PlayerSearchPickerItem = {
  id: string;
  label: string;
  badge?: string | null;
  kind?: "default" | "action";
  meta?: string | null;
};

export type PlayerSearchPickerInputProps = Omit<
  TextInputProps,
  "autoCapitalize" | "onChangeText" | "placeholder" | "value"
>;

type PlayerSearchPickerProps = {
  activeLabel?: string;
  autoCapitalize?: "none" | "words" | "sentences" | "characters";
  clearLabel?: string;
  emptyText?: string;
  helperText?: string | null;
  hideResults?: boolean;
  inactiveLabel?: string;
  inputProps?: PlayerSearchPickerInputProps;
  items: PlayerSearchPickerItem[];
  nestedScrollEnabled?: boolean;
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

export default function PlayerSearchPicker({
  activeLabel = "Selected",
  autoCapitalize = "words",
  clearLabel = "Clear",
  emptyText = "No players match that search yet.",
  helperText = null,
  hideResults = false,
  inactiveLabel = "View",
  inputProps,
  items,
  nestedScrollEnabled = false,
  onClearQuery,
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
  const {
    autoCorrect = false,
    placeholderTextColor = COLORS.textMuted,
    style: inputStyle,
    ...restInputProps
  } = inputProps ?? {};

  return (
    <View style={styles.container}>
      {helperText ? <Text style={styles.helperText}>{helperText}</Text> : null}
      <View style={styles.inputRow}>
        <TextInput
          {...restInputProps}
          value={query}
          onChangeText={onQueryChange}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          style={[styles.searchInput, inputStyle]}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
        />
        {query.trim().length > 0 && onClearQuery ? (
          <Pressable onPress={onClearQuery} style={styles.clearButton}>
            <Text style={styles.clearButtonText}>{clearLabel}</Text>
          </Pressable>
        ) : null}
      </View>

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
                      item.kind === "action" && styles.railItemAction,
                      active && styles.railItemActive,
                    ]}
                    onPress={() => onSelect(item.id)}
                  >
                    <View style={styles.railLabelRow}>
                      <Text
                        style={[
                          styles.railLabel,
                          item.kind === "action" && styles.railLabelAction,
                          active && styles.railLabelActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {item.badge ? (
                        <View style={[styles.railBadge, active && styles.railBadgeActive]}>
                          <Text
                            style={[
                              styles.railBadgeText,
                              active && styles.railBadgeTextActive,
                            ]}
                          >
                            {item.badge}
                          </Text>
                        </View>
                      ) : null}
                    </View>
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
                        <View style={styles.listLabelRow}>
                          <Text style={styles.listLabel}>{item.label}</Text>
                          {item.badge ? (
                            <View
                              style={[
                                styles.listBadge,
                                active && styles.listBadgeActive,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.listBadgeText,
                                  active && styles.listBadgeTextActive,
                                ]}
                              >
                                {item.badge}
                              </Text>
                            </View>
                          ) : null}
                        </View>
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
    width: "100%",
  },
  helperText: {
    color: COLORS.sub,
    fontSize: 11,
    lineHeight: 16,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
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
  clearButton: {
    minHeight: 42,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  clearButtonText: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: "800",
  },
  rail: {
    gap: 8,
    paddingRight: 8,
    alignItems: "center",
  },
  railLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  railItem: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: COLORS.whiteSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  railItemAction: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.cyan,
  },
  railItemActive: {
    borderColor: COLORS.accent,
  },
  railLabel: {
    color: COLORS.sub,
    fontSize: 11,
    fontWeight: "700",
  },
  railLabelAction: {
    color: COLORS.text,
  },
  railLabelActive: {
    color: COLORS.accent,
  },
  railBadge: {
    minHeight: 18,
    borderRadius: 999,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  railBadgeActive: {
    backgroundColor: COLORS.accent,
  },
  railBadgeText: {
    color: COLORS.accent,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  railBadgeTextActive: {
    color: COLORS.card,
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
  listLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  listLabel: {
    flexShrink: 1,
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "800",
  },
  listBadge: {
    minHeight: 18,
    borderRadius: 999,
    paddingHorizontal: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accentSoft,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  listBadgeActive: {
    backgroundColor: COLORS.accent,
  },
  listBadgeText: {
    color: COLORS.accent,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  listBadgeTextActive: {
    color: COLORS.card,
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
