import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Vibration,
} from 'react-native';

type Props = {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
  step?: number;
  helperText?: string;
  compact?: boolean;
  vibrate?: boolean;
};

const HOLD_DELAY = 300;
const HOLD_INTERVAL = 70;
const VIBE_INTERVAL = 50;

const sciFi = {
  panel: '#0E152B',
  panel2: '#121C39',
  border: 'rgba(120,160,255,0.14)',
  borderStrong: 'rgba(99,230,255,0.28)',
  text: '#F4F7FF',
  subtext: '#9AAAD0',
  dim: '#7080A6',
  cyan: '#63E6FF',
  green: '#4CE0B3',
  red: '#FF7183',
};

function StatAdjuster({
  label,
  value,
  onIncrement,
  onDecrement,
  min = -Infinity,
  max = Infinity,
  step = 1,
  helperText,
  compact = false,
  vibrate = true,
}: Props) {
  const canInc = value + step <= max;
  const canDec = value - step >= min;

  const holdTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdDirection = useRef<'inc' | 'dec' | null>(null);
  const lastVibe = useRef(0);

  const triggerVibration = useCallback(() => {
    if (!vibrate) return;

    const now = Date.now();
    if (now - lastVibe.current > VIBE_INTERVAL) {
      Vibration.vibrate(10);
      lastVibe.current = now;
    }
  }, [vibrate]);

  const stopHold = useCallback(() => {
    if (holdTimeout.current) {
      clearTimeout(holdTimeout.current);
      holdTimeout.current = null;
    }

    if (holdInterval.current) {
      clearInterval(holdInterval.current);
      holdInterval.current = null;
    }

    holdDirection.current = null;
  }, []);

  const inc = useCallback(() => {
    if (!canInc) return;
    triggerVibration();
    onIncrement();
  }, [canInc, onIncrement, triggerVibration]);

  const dec = useCallback(() => {
    if (!canDec) return;
    triggerVibration();
    onDecrement();
  }, [canDec, onDecrement, triggerVibration]);

  const startHold = useCallback(
    (
      fn: () => void,
      allowed: boolean,
      direction: 'inc' | 'dec'
    ) => {
      if (!allowed) return;

      stopHold();
      holdDirection.current = direction;

      holdTimeout.current = setTimeout(() => {
        holdInterval.current = setInterval(() => {
          fn();
        }, HOLD_INTERVAL);
      }, HOLD_DELAY);
    },
    [stopHold]
  );

  useEffect(() => {
    if (
      (holdDirection.current === 'inc' && !canInc) ||
      (holdDirection.current === 'dec' && !canDec)
    ) {
      stopHold();
    }
  }, [canInc, canDec, stopHold]);

  useEffect(() => stopHold, [stopHold]);

  const valueText = useMemo(() => String(value), [value]);

  return (
    <View style={[styles.container, compact && styles.compactContainer]}>
      <View style={styles.card}>
        <View style={styles.glowOrb} />

        <View style={styles.header}>
          <View style={styles.titleBlock}>
            <Text style={styles.eyebrow}>STAT CONTROL</Text>
            <Text style={styles.label}>{label}</Text>
          </View>

          {(Number.isFinite(min) || Number.isFinite(max)) && (
            <View style={styles.rangeBadge}>
              <Text style={styles.rangeText}>
                {Number.isFinite(min) ? min : '−∞'} to{' '}
                {Number.isFinite(max) ? max : '∞'}
              </Text>
            </View>
          )}
        </View>

        {!!helperText && (
          <Text style={styles.helperText}>{helperText}</Text>
        )}

        <View style={styles.row}>
          <Pressable
            onPress={canDec ? dec : undefined}
            disabled={!canDec}
            onPressIn={() => startHold(dec, canDec, 'dec')}
            onPressOut={stopHold}
            onPressCancel={stopHold}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${label}`}
            accessibilityState={{ disabled: !canDec }}
            style={({ pressed }) => [
              styles.button,
              compact && styles.compactButton,
              styles.minusButton,
              !canDec && styles.disabledButton,
              pressed && canDec && styles.pressedButton,
            ]}
          >
            <Text style={[styles.buttonSymbol, compact && styles.compactSymbol]}>
              −
            </Text>
          </Pressable>

          <View style={styles.valueWrap}>
            <Text style={[styles.value, compact && styles.compactValue]}>
              {valueText}
            </Text>

            <View style={styles.metaRow}>
              {step !== 1 && (
                <Text style={styles.stepText}>step {step}</Text>
              )}
            </View>
          </View>

          <Pressable
            onPress={canInc ? inc : undefined}
            disabled={!canInc}
            onPressIn={() => startHold(inc, canInc, 'inc')}
            onPressOut={stopHold}
            onPressCancel={stopHold}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={`Increase ${label}`}
            accessibilityState={{ disabled: !canInc }}
            style={({ pressed }) => [
              styles.button,
              compact && styles.compactButton,
              styles.plusButton,
              !canInc && styles.disabledButton,
              pressed && canInc && styles.pressedButton,
            ]}
          >
            <Text style={[styles.buttonSymbol, compact && styles.compactSymbol]}>
              +
            </Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default memo(StatAdjuster);

const styles = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  compactContainer: {
    marginBottom: 10,
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 18,
    padding: 14,
    backgroundColor: sciFi.panel,
    borderWidth: 1,
    borderColor: sciFi.border,
    shadowColor: '#63E6FF',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  glowOrb: {
    position: 'absolute',
    top: -30,
    right: -14,
    width: 110,
    height: 110,
    borderRadius: 999,
    backgroundColor: 'rgba(99,230,255,0.06)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 6,
  },
  titleBlock: {
    flex: 1,
  },
  eyebrow: {
    color: sciFi.cyan,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  label: {
    color: sciFi.text,
    fontSize: 15,
    fontWeight: '900',
  },
  rangeBadge: {
    minHeight: 24,
    borderRadius: 999,
    paddingHorizontal: 10,
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  rangeText: {
    color: sciFi.dim,
    fontSize: 11,
    fontWeight: '800',
  },
  helperText: {
    color: sciFi.subtext,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowOpacity: 0.14,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
  compactButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
  },
  plusButton: {
    backgroundColor: 'rgba(76,224,179,0.12)',
    borderColor: 'rgba(76,224,179,0.26)',
    shadowColor: sciFi.green,
  },
  minusButton: {
    backgroundColor: 'rgba(255,113,131,0.12)',
    borderColor: 'rgba(255,113,131,0.26)',
    shadowColor: sciFi.red,
  },
  disabledButton: {
    opacity: 0.28,
  },
  pressedButton: {
    transform: [{ scale: 0.97 }],
    opacity: 0.92,
  },
  buttonSymbol: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
    lineHeight: 30,
  },
  compactSymbol: {
    fontSize: 24,
    lineHeight: 26,
  },
  valueWrap: {
    flex: 1,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: sciFi.panel2,
    borderWidth: 1,
    borderColor: 'rgba(120,160,255,0.10)',
  },
  value: {
    color: sciFi.text,
    fontSize: 30,
    fontWeight: '900',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  compactValue: {
    fontSize: 24,
  },
  metaRow: {
    marginTop: 4,
    minHeight: 16,
    justifyContent: 'center',
  },
  stepText: {
    color: sciFi.cyan,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
