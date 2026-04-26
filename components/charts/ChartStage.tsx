import React from "react";
import {
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import {
  CHART_LAYOUT,
  getChartStagePreset,
  type ChartStageTone,
} from "./chartVisualSystem";

type Props = {
  tone?: ChartStageTone;
  style?: StyleProp<ViewStyle>;
  plotStyle?: StyleProp<ViewStyle>;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
};

export default function ChartStage({
  tone = "standard",
  style,
  plotStyle,
  header,
  footer,
  children,
}: Props) {
  const preset = getChartStagePreset(tone);

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: preset.shellFill,
          borderColor: preset.shellBorder,
        },
        style,
      ]}
    >
      {header}
      <View
        style={[
          styles.plot,
          {
            backgroundColor: preset.plotFill,
            borderColor: preset.plotBorder,
          },
          plotStyle,
        ]}
      >
        {children}
      </View>
      {footer}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: CHART_LAYOUT.cardGap,
    borderRadius: CHART_LAYOUT.sectionRadius,
    borderWidth: 1,
    padding: 8,
  },
  plot: {
    borderRadius: CHART_LAYOUT.cardRadius,
    borderWidth: 1,
    overflow: "hidden",
  },
});
