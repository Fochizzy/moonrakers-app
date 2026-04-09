import React, { useEffect, useRef } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

import Text from '@/components/ui/Text';
import StarryNight from '@/components/ui/StarryNight';

const COLORS = {
  bg: '#040814',
  surface: '#0A1428',
  border: 'rgba(139,92,246,0.25)',
  textPrimary: '#F8FBFF',
  textSecondary: '#C7D6F3',
  brand: '#8B5CF6',
};

type Def = {
  key: string;
  title: string;
  body: string;
};

const DEFINITIONS: Def[] = [
  { key: 'totalPrestige', title: 'Prestige', body: 'All prestige earned including direct, assist, and objective sources.' },
  { key: 'directPrestige', title: 'Direct Prestige', body: 'Prestige earned directly from your own actions (contracts, plays).' },
  { key: 'assistPrestigeReceived', title: 'Assist Received', body: 'Prestige gained from other players assisting you.' },
  { key: 'assistPrestigeSent', title: 'Assist Sent', body: 'Prestige value you contributed to others.' },

  { key: 'efficiency', title: 'Efficiency', body: 'Total value generated per combined contracts and assists.' },
  { key: 'assistanceEfficiency', title: 'Assist Efficiency', body: 'Value gained from assists relative to assist activity.' },
  { key: 'directEfficiency', title: 'Direct Efficiency', body: 'Direct prestige generated per contract.' },

  { key: 'failureRate', title: 'Failure Rate', body: 'Percentage of failed contract attempts.' },
  { key: 'contractFailureRatio', title: 'Failure Ratio', body: 'Relative failure pressure compared to total contract volume.' },

  { key: 'consistencyScore', title: 'Consistency', body: 'How stable your performance is across games. Lower variance = higher consistency.' },
  { key: 'clutchScore', title: 'Clutch', body: 'Win rate in close games.' },
  { key: 'carryFactor', title: 'Carry Factor', body: 'How much of your Prestige is self-generated.' },
  { key: 'momentum', title: 'Momentum', body: 'Recent performance vs long-term average.' },

  { key: 'prestigePerTurn', title: 'Prestige / Turn', body: 'How efficiently turns are converted into prestige.' },

  { key: 'leadConversion', title: 'Lead Conversion', body: 'How often early leads turn into wins.' },
  { key: 'lateLeadConversion', title: 'Late Lead Conversion', body: 'How often late leads convert into wins.' },

  { key: 'objectiveConversionRate', title: 'Objective Conversion', body: 'Win rate when leading in objectives.' },
  { key: 'supportConversionRate', title: 'Support Conversion', body: 'Win rate when leading in assists/support.' },

  { key: 'tempoIndex', title: 'Tempo', body: 'Blend of efficiency, early pressure, and speed of value generation.' },
  { key: 'interactionIndex', title: 'Interaction', body: 'Total involvement via contracts and assists.' },
  { key: 'aggroIndex', title: 'Aggression', body: 'How strongly a player pushes early leads and objectives.' },

  { key: 'turnOrderWinCorrelation', title: 'Seat vs Win Correlation', body: 'How strongly turn order affects winning outcomes.' },

  { key: 'score', title: 'Score', body: 'Composite metric including prestige, contracts, assists, and penalties.' },

  { key: 'objectiveShareOfPrestige', title: 'Objective Share', body: 'Percent of Prestige coming from objectives.' },

  { key: 'netAssistValue', title: 'Net Assist Value', body: 'Net benefit from assist interactions (received vs given).' },

  { key: 'synergyIndex', title: 'Synergy Index', body: 'Blended metric capturing teamwork, efficiency, and win alignment.' },
];

export default function DefinitionsScreen() {
  const params = useLocalSearchParams();
  const scrollRef = useRef<ScrollView>(null);
  const targetKey = params?.metric as string | undefined;

  const index = DEFINITIONS.findIndex((d) => d.key === targetKey);

  useEffect(() => {
    if (index >= 0 && scrollRef.current) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: index * 90, animated: true });
      }, 300);
    }
  }, [index]);

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StarryNight />

      <ScrollView ref={scrollRef} contentContainerStyle={styles.container}>
        {DEFINITIONS.map((def, i) => {
          const highlight = def.key === targetKey;

          return (
            <View
              key={def.key}
              style={[
                styles.card,
                highlight && styles.highlight,
              ]}
            >
              <Text style={styles.title}>{def.title}</Text>
              <Text style={styles.body}>{def.body}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    gap: 10,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  highlight: {
    borderColor: COLORS.brand,
    backgroundColor: 'rgba(139,92,246,0.15)',
  },
  title: {
    color: COLORS.textPrimary,
    fontWeight: '900',
    fontSize: 14,
    marginBottom: 4,
  },
  body: {
    color: COLORS.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});


