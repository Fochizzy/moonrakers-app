import { Platform } from "react-native";
import * as Haptics from "expo-haptics";

// Haptics are a no-op on web and can reject on devices without a taptic engine,
// so every call is guarded and swallowed. Callers never need to await or catch.

const supported = Platform.OS === "ios" || Platform.OS === "android";

function run(effect: () => Promise<void>) {
  if (!supported) return;
  effect().catch(() => {});
}

/** Light tick for incrementing a counter, toggling a chip, cycling a choice. */
export function selectionFeedback() {
  run(() => Haptics.selectionAsync());
}

/** Medium thud for a committed action: saving a turn, confirming an edit. */
export function commitFeedback() {
  run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}

/** Heavy notification for finishing a game. */
export function successFeedback() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** Buzz for a rejected action: invalid turn, blocked submit. */
export function warningFeedback() {
  run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning));
}
