import React from "react";
import {
  Image,
  ImageBackground,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "@/theme";

const BACKGROUND = require("@/assets/Background.png");
const HOMEPAGE = require("@/assets/homepage.png");
const MOONRISE = require("@/assets/Moonrise.png");
const RINGS = require("@/assets/Rings.png");
const COSMIC = require("@/assets/Cosmic.png");
const MOON = require("@/assets/Moon.png");
const EMBLEM = require("@/assets/images/moon-header-emblem-v2.png");

const ART_SOURCES = {
  background: BACKGROUND,
  homepage: HOMEPAGE,
  moonrise: MOONRISE,
  rings: RINGS,
  cosmic: COSMIC,
} as const;

const IDENTITY_SOURCES = {
  emblem: EMBLEM,
  moon: MOON,
} as const;

export const BACKGROUND_PRESETS = {
  quiet: "quiet",
  auth: "auth",
  command: "command",
  archive: "archive",
  intel: "intel",
  database: "database",
  tactical: "tactical",
} as const;

export type ScreenBackgroundPreset = keyof typeof BACKGROUND_PRESETS;

type ScreenBackgroundProps = {
  preset?: ScreenBackgroundPreset;
  style?: StyleProp<ViewStyle>;
};

export default function ScreenBackground({
  preset = "quiet",
  style,
}: ScreenBackgroundProps) {
  const theme = useTheme();
  const config = theme.colors.presets[preset];
  const backgroundSource = ART_SOURCES[config.art];
  const identitySource =
    config.identity === "moon" ? IDENTITY_SOURCES.moon : IDENTITY_SOURCES.emblem;

  return (
    <View pointerEvents="none" style={[styles.root, style]}>
      <ImageBackground
        source={backgroundSource}
        resizeMode="cover"
        style={styles.fill}
      >
        <View
          style={[
            styles.overlay,
            {
              backgroundColor: config.overlay,
            },
          ]}
        />

        <View
          style={[
            styles.topGlow,
            {
              backgroundColor: config.glowA,
            },
          ]}
        />

        <View
          style={[
            styles.sideGlow,
            {
              backgroundColor: config.glowB,
            },
          ]}
        />

        <Image
          source={identitySource}
          resizeMode="contain"
          style={[
            styles.identity,
            {
              opacity: config.identityOpacity,
              top: config.identityTop,
              right: config.identityRight,
              width: config.identityWidth,
              height: config.identityHeight,
            },
          ]}
        />
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  fill: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  topGlow: {
    position: "absolute",
    top: -96,
    left: -40,
    right: -40,
    height: 260,
    borderRadius: 999,
  },
  sideGlow: {
    position: "absolute",
    right: -70,
    top: "26%",
    width: 220,
    height: 220,
    borderRadius: 999,
  },
  identity: {
    position: "absolute",
  },
});
