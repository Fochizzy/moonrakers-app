import 'react-native-gesture-handler';

import React from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { Stack } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

import { ThemeProvider, useTheme } from '@/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const STAR_POSITIONS = [
  { top: 28, left: 24, size: 2, opacity: 0.55 },
  { top: 52, left: 88, size: 2, opacity: 0.9 },
  { top: 74, left: 164, size: 1.5, opacity: 0.5 },
  { top: 96, left: 304, size: 2, opacity: 0.7 },
  { top: 118, left: 222, size: 1.5, opacity: 0.65 },
  { top: 142, left: 48, size: 2, opacity: 0.8 },
  { top: 170, left: 134, size: 1.5, opacity: 0.45 },
  { top: 194, left: 278, size: 2, opacity: 0.75 },
  { top: 228, left: 18, size: 1.5, opacity: 0.55 },
  { top: 250, left: 112, size: 2, opacity: 0.85 },
  { top: 276, left: 196, size: 1.5, opacity: 0.6 },
  { top: 302, left: 326, size: 2, opacity: 0.8 },
  { top: 332, left: 72, size: 1.5, opacity: 0.5 },
  { top: 360, left: 154, size: 2, opacity: 0.72 },
  { top: 388, left: 246, size: 1.5, opacity: 0.9 },
  { top: 414, left: 344, size: 2, opacity: 0.58 },
  { top: 448, left: 36, size: 1.5, opacity: 0.68 },
  { top: 472, left: 126, size: 2, opacity: 0.82 },
  { top: 498, left: 214, size: 1.5, opacity: 0.52 },
  { top: 524, left: 292, size: 2, opacity: 0.76 },
  { top: 552, left: 82, size: 1.5, opacity: 0.62 },
  { top: 578, left: 176, size: 2, opacity: 0.92 },
  { top: 606, left: 332, size: 1.5, opacity: 0.55 },
  { top: 632, left: 52, size: 2, opacity: 0.72 },
  { top: 662, left: 146, size: 1.5, opacity: 0.47 },
  { top: 688, left: 236, size: 2, opacity: 0.84 },
  { top: 714, left: 314, size: 1.5, opacity: 0.62 },
  { top: 742, left: 98, size: 2, opacity: 0.75 },
  { top: 768, left: 192, size: 1.5, opacity: 0.54 },
  { top: 792, left: 276, size: 2, opacity: 0.88 },
  { top: 826, left: 26, size: 1.5, opacity: 0.42 },
  { top: 854, left: 122, size: 2, opacity: 0.78 },
  { top: 880, left: 208, size: 1.5, opacity: 0.58 },
  { top: 906, left: 336, size: 2, opacity: 0.7 },
  { top: 936, left: 64, size: 1.5, opacity: 0.64 },
  { top: 962, left: 158, size: 2, opacity: 0.87 },
  { top: 988, left: 252, size: 1.5, opacity: 0.49 },
  { top: 1014, left: 308, size: 2, opacity: 0.79 },
  { top: 1046, left: 40, size: 1.5, opacity: 0.53 },
  { top: 1072, left: 182, size: 2, opacity: 0.9 },
];

function GlobalHeaderTitle() {
  return (
    <View style={styles.headerTitleWrap}>
      <View style={styles.headerMoon}>
        <View style={styles.moonRing} />
        <View style={styles.headerMoonCut} />
      </View>
      <View>
        <View style={styles.headerTextWrap}>
          <View />
        </View>
      </View>
    </View>
  );
}

function GlobalHeaderCenter() {
  return (
    <View style={styles.headerCenter}>
      <View style={styles.headerMoonWrap}>
        <View style={styles.headerMoonGlow} />
        <View style={styles.headerMoon}>
          <View style={styles.moonRing} />
          <View style={styles.headerMoonCut} />
        </View>
      </View>
      <View style={styles.headerTitleBlock}>
        <HeaderTitleText />
      </View>
    </View>
  );
}

function HeaderTitleText() {
  return (
    <View style={styles.headerTitleTextContainer}>
      <HeaderWord />
    </View>
  );
}

function HeaderWord() {
  return (
    <View>
      <HeaderText />
    </View>
  );
}

function HeaderText() {
  return (
    <View>
      <TextShim />
    </View>
  );
}

function TextShim() {
  const ReactNative = require('react-native');
  const Text = ReactNative.Text;
  return <Text style={styles.headerTitleText}>Moonraker&apos;s</Text>;
}

function StarField() {
  return (
    <View style={styles.starField} pointerEvents="none">
      {STAR_POSITIONS.map((star, index) => (
        <View
          key={`star-${index}`}
          style={[
            styles.star,
            {
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              borderRadius: star.size / 2,
              opacity: star.opacity,
            },
          ]}
        />
      ))}
    </View>
  );
}

function AppBackground() {
  return (
    <>
      <View style={styles.baseBg} pointerEvents="none" />
      <StarField />
      <View style={styles.nebulaPurple} pointerEvents="none" />
      <View style={styles.nebulaBlue} pointerEvents="none" />
      <View style={styles.topGlow} pointerEvents="none" />
      <View style={styles.sideGlow} pointerEvents="none" />
      <View style={styles.bottomGlow} pointerEvents="none" />
      <View style={styles.orbitRing} pointerEvents="none" />
      <View style={styles.orbitRingSecondary} pointerEvents="none" />
      <View style={styles.gridFade} pointerEvents="none" />
    </>
  );
}

function AppNavigator() {
  const t = useTheme();

  return (
    <View
      style={[
        styles.appShell,
        { backgroundColor: t.colors.background.primary },
      ]}
    >
      <AppBackground />

      <StatusBar style="light" translucent backgroundColor="transparent" />

      <Stack
        screenOptions={{
          headerShown: true,
          animation: 'fade',
          contentStyle: {
            backgroundColor: 'transparent',
          },
          headerTransparent: false,
          headerShadowVisible: false,
          headerTitleAlign: 'center',
          headerStyle: {
            backgroundColor: '#030617',
          },
          headerTitle: () => <GlobalHeaderCenter />,
          headerTintColor: '#E2E8F0',
          headerBackTitleVisible: false,
        }}
      />
    </View>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AppNavigator />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#02030A',
  },

  appShell: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },

  baseBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#02030A',
  },

  starField: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.32,
  },

  star: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
  },

  nebulaPurple: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.12,
    left: SCREEN_WIDTH * 0.08,
    width: 280,
    height: 280,
    borderRadius: 180,
    backgroundColor: 'rgba(168, 85, 247, 0.13)',
    transform: [{ scaleX: 1.08 }, { rotate: '8deg' }],
  },

  nebulaBlue: {
    position: 'absolute',
    top: SCREEN_HEIGHT * 0.48,
    right: -40,
    width: 240,
    height: 240,
    borderRadius: 160,
    backgroundColor: 'rgba(0, 191, 255, 0.10)',
    transform: [{ scaleX: 1.18 }, { rotate: '-12deg' }],
  },

  topGlow: {
    position: 'absolute',
    top: -140,
    left: -60,
    right: -60,
    height: 320,
    borderRadius: 999,
    backgroundColor: 'rgba(0, 191, 255, 0.18)',
    transform: [{ scaleX: 1.3 }, { rotate: '2deg' }],
  },

  sideGlow: {
    position: 'absolute',
    right: -120,
    top: '25%',
    width: 260,
    height: 260,
    borderRadius: 999,
    backgroundColor: 'rgba(168, 85, 247, 0.22)',
  },

  bottomGlow: {
    position: 'absolute',
    bottom: -140,
    left: -40,
    right: -40,
    height: 280,
    borderRadius: 999,
    backgroundColor: 'rgba(168, 85, 247, 0.16)',
  },

  orbitRing: {
    position: 'absolute',
    width: 500,
    height: 500,
    borderRadius: 250,
    borderWidth: 1,
    borderColor: 'rgba(0,191,255,0.16)',
    top: SCREEN_HEIGHT * 0.2,
    left: -150,
    transform: [{ rotate: '25deg' }],
  },

  orbitRingSecondary: {
    position: 'absolute',
    width: 340,
    height: 340,
    borderRadius: 170,
    borderWidth: 1,
    borderColor: 'rgba(192,132,252,0.14)',
    bottom: SCREEN_HEIGHT * 0.08,
    right: -90,
    transform: [{ rotate: '-18deg' }],
  },

  gridFade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.015)',
  },

  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },

  headerMoonWrap: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  headerMoonGlow: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,191,255,0.28)',
  },

  headerTitleBlock: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitleTextContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitleText: {
    color: '#C084FC',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0.6,
    textShadowColor: 'rgba(168,85,247,0.9)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },

  headerMoon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#00BFFF',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#00BFFF',
    shadowOpacity: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },

  moonRing: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(168,85,247,0.4)',
    top: -3,
    left: -3,
  },

  headerMoonCut: {
    position: 'absolute',
    right: -6,
    top: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#02030A',
  },

  headerTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  headerTextWrap: {
    justifyContent: 'center',
  },
});
