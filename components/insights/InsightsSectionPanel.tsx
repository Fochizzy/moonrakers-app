import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import DefinitionRichText from '@/components/ui/DefinitionRichText';
import Text from '@/components/ui/Text';

type Props = {
  eyebrow: string;
  title: string;
  meta?: string;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

export default function InsightsSectionPanel({
  eyebrow,
  title,
  meta,
  children,
  style,
}: Props) {
  return (
    <View style={[styles.sectionPanel, style]}>
      <View pointerEvents="none" style={styles.sectionGlow} />
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleWrap}>
          <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
          <DefinitionRichText text={title} style={styles.sectionTitle} />
        </View>
        {meta ? <Text style={styles.sectionMeta}>{meta}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionPanel: {
    position: 'relative',
    overflow: 'hidden',
    gap: 12,
    padding: 15,
    borderRadius: 22,
    backgroundColor: 'rgba(7,11,23,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(148,163,184,0.12)',
  },
  sectionGlow: {
    position: 'absolute',
    top: -30,
    right: -10,
    width: 140,
    height: 140,
    borderRadius: 999,
    backgroundColor: 'rgba(59,130,246,0.05)',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionTitleWrap: {
    flex: 1,
    gap: 4,
  },
  sectionEyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
    color: 'rgba(103,232,249,0.94)',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#f8fafc',
  },
  sectionMeta: {
    fontSize: 11,
    fontWeight: '900',
    color: 'rgba(148,163,184,0.88)',
    textTransform: 'uppercase',
    letterSpacing: 0.9,
  },
});
