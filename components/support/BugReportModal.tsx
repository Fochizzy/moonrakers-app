import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import Text from '@/components/ui/Text';
import {
  isSubmittableBugReport,
  MAX_BUG_REPORT_LENGTH,
  submitBugReport,
} from '@/lib/support/submitBugReport';
import { COLORS } from '@/utils/colors';

type BugReportModalProps = {
  appVersion?: string | null;
  onClose: () => void;
  platform?: string | null;
  profileId: string | null;
  reporterName: string;
  visible: boolean;
};

export default function BugReportModal({
  appVersion,
  onClose,
  platform,
  profileId,
  reporterName,
  visible,
}: BugReportModalProps) {
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // Reopening after a send should offer a blank form, not the last report.
  useEffect(() => {
    if (visible) {
      setDescription('');
      setError(null);
      setSending(false);
      setSent(false);
    }
  }, [visible]);

  async function handleSubmit() {
    setSending(true);
    setError(null);

    const result = await submitBugReport({
      appVersion,
      description,
      platform,
      profileId,
      reporterName,
    });

    setSending(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setSent(true);
  }

  const canSubmit = isSubmittableBugReport(description) && !sending;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Close bug report"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />
        <View style={styles.card}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.eyebrow}>Feedback</Text>
            <Text style={styles.title}>{sent ? 'Report sent' : 'Report a bug'}</Text>

            {sent ? (
              <>
                <Text style={styles.body}>
                  Thanks — that went straight to Izzy. If it needs a
                  back-and-forth, email info@moonrakersapp.org.
                </Text>
                <Pressable
                  accessibilityRole="button"
                  onPress={onClose}
                  style={[styles.button, styles.buttonPrimary]}
                >
                  <Text style={styles.buttonPrimaryText}>Done</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.body}>
                  What went wrong? The more specific the better — what you
                  tapped, what you expected, and what happened instead.
                </Text>

                <TextInput
                  accessibilityLabel="Describe the bug"
                  editable={!sending}
                  maxLength={MAX_BUG_REPORT_LENGTH}
                  multiline
                  onChangeText={setDescription}
                  placeholder="The score did not update after I ended my turn…"
                  placeholderTextColor={COLORS.muted}
                  style={styles.input}
                  textAlignVertical="top"
                  value={description}
                />

                <Text style={styles.meta}>
                  Sent as {reporterName || 'Unknown player'}
                </Text>

                {error ? <Text style={styles.error}>{error}</Text> : null}

                <View style={styles.actions}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={sending}
                    onPress={onClose}
                    style={[styles.button, styles.buttonGhost]}
                  >
                    <Text style={styles.buttonGhostText}>Cancel</Text>
                  </Pressable>

                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !canSubmit }}
                    disabled={!canSubmit}
                    onPress={handleSubmit}
                    style={[
                      styles.button,
                      styles.buttonPrimary,
                      !canSubmit && styles.buttonDisabled,
                    ]}
                  >
                    {sending ? (
                      <ActivityIndicator color={COLORS.textPrimary} size="small" />
                    ) : (
                      <Text style={styles.buttonPrimaryText}>Submit</Text>
                    )}
                  </Pressable>
                </View>
              </>
            )}
          </ScrollView>
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
    maxWidth: 460,
    maxHeight: '80%',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surfaceAlt,
  },
  content: {
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
    fontSize: 22,
    fontWeight: '800',
  },
  body: {
    color: COLORS.sub,
    fontSize: 14,
    lineHeight: 21,
  },
  input: {
    minHeight: 130,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.bg,
    color: COLORS.text,
    fontSize: 15,
    padding: 12,
  },
  meta: {
    color: COLORS.muted,
    fontSize: 12,
  },
  error: {
    color: COLORS.danger,
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  button: {
    flex: 1,
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  buttonPrimary: {
    borderColor: 'rgba(168,85,247,0.55)',
    backgroundColor: COLORS.accent,
  },
  buttonPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonGhost: {
    borderColor: COLORS.border,
    backgroundColor: 'transparent',
  },
  buttonGhostText: {
    color: COLORS.sub,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
});
