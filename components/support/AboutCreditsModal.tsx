import React, { useState } from 'react';
import { Linking, Modal, Pressable, StyleSheet, View } from 'react-native';

import Text from '@/components/ui/Text';
import { COLORS } from '@/utils/colors';
import {
  AFFILIATION_DISCLAIMER,
  CREDIT_LINE_PREFIX,
  getCreditLinks,
} from '@/utils/siteCredits';

type AboutCreditsModalProps = {
  onClose: () => void;
  visible: boolean;
};

/**
 * The same credit and disclaimer the website ends every page on, reached from
 * the small link under the Command page. Labels whose destination is not
 * configured yet still appear — they just sit there as text instead of opening
 * a browser.
 */
export default function AboutCreditsModal({
  onClose,
  visible,
}: AboutCreditsModalProps) {
  const [error, setError] = useState<string | null>(null);
  const links = getCreditLinks();

  async function openLink(url: string, label: string) {
    setError(null);

    try {
      await Linking.openURL(url);
    } catch {
      // A phone with no browser that can take the URL is rare but not
      // impossible, and a tap that silently does nothing reads as a bug.
      setError(`Could not open ${label}. Try again from a browser.`);
    }
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Close credits"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.card}>
          <Text style={styles.eyebrow}>Credits</Text>
          <Text style={styles.title}>{CREDIT_LINE_PREFIX}</Text>

          <View style={styles.links}>
            {links.map((link) =>
              link.url ? (
                <Pressable
                  accessibilityHint={`Opens ${link.label.toLowerCase()} in your browser`}
                  accessibilityRole="link"
                  accessibilityLabel={link.label}
                  key={link.label}
                  onPress={() => {
                    void openLink(link.url as string, link.label);
                  }}
                  style={({ pressed }) => [
                    styles.linkChip,
                    pressed && styles.linkChipPressed,
                  ]}
                >
                  <Text style={styles.linkChipText}>{link.label}</Text>
                </Pressable>
              ) : (
                <View key={link.label} style={[styles.linkChip, styles.linkChipIdle]}>
                  <Text style={styles.linkChipIdleText}>{link.label}</Text>
                  <Text style={styles.linkChipNote}>Coming soon</Text>
                </View>
              ),
            )}
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.disclaimer}>{AFFILIATION_DISCLAIMER}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4,8,20,0.72)',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
    padding: 20,
    gap: 12,
  },
  eyebrow: {
    color: COLORS.gold,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 24,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  linkChip: {
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.34)',
    backgroundColor: 'rgba(37,99,235,0.16)',
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  linkChipPressed: {
    opacity: 0.78,
  },
  linkChipIdle: {
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  linkChipText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  linkChipIdleText: {
    color: COLORS.sub,
    fontSize: 13,
    fontWeight: '800',
  },
  linkChipNote: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  error: {
    color: COLORS.danger,
    fontSize: 13,
  },
  disclaimer: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  close: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  closePressed: {
    opacity: 0.78,
  },
  closeText: {
    color: COLORS.sub,
    fontSize: 15,
    fontWeight: '700',
  },
});
