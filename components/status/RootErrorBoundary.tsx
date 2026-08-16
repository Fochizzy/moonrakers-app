import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import Text from "@/components/ui/Text";
import { reportError } from "@/lib/telemetry/errorReporting";

type Props = {
  children: React.ReactNode;
};

type State = {
  hasError: boolean;
};

/**
 * Last-resort catch for render-phase crashes. Files a report, then offers a
 * reset instead of a white screen — mid-game state lives in the synced draft,
 * so remounting the tree loses nothing.
 */
export default class RootErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: React.ErrorInfo) {
    void reportError(error, {
      isFatal: true,
      context: {
        source: "error-boundary",
        componentStack: String(info?.componentStack ?? "").slice(0, 2000),
      },
    });
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>Something broke</Text>
        <Text style={styles.body}>
          The error has been reported. Your game progress is synced, so nothing
          is lost.
        </Text>
        <Pressable
          onPress={this.handleReset}
          accessibilityRole="button"
          accessibilityLabel="Reload the app"
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
        >
          <Text style={styles.buttonText}>Reload</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#05070b",
    padding: 32,
    gap: 12,
  },
  title: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
  },
  body: {
    color: "rgba(226,232,240,0.72)",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.4)",
    backgroundColor: "rgba(96,165,250,0.18)",
  },
  buttonPressed: {
    backgroundColor: "rgba(96,165,250,0.3)",
  },
  buttonText: {
    color: "#E0F2FE",
    fontSize: 14,
    fontWeight: "800",
  },
});
