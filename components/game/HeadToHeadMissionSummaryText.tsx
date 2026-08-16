import React from 'react';

import Text from '@/components/ui/Text';

import type { HeadToHeadMissionSummary } from './gameScreenUi';
import { styles } from './gameScreenStyles';

export default function HeadToHeadMissionSummaryText({
  summary,
}: {
  summary: HeadToHeadMissionSummary;
}) {
  return (
    <Text style={styles.headToHeadActiveMeta}>1st: {summary.firstPlaceName} / 2nd: {summary.secondPlaceName}</Text>
  );
}
