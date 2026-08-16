import React, { useEffect, useRef, useState } from 'react';
import { ScrollView } from 'react-native';

import type { LeaderboardEntry } from '@/engine/gameEngine';
import { getCenteredLeaderboardOffset } from '@/lib/game-screen/leaderboardStrip';

import AnimatedLeaderboardPill from './AnimatedLeaderboardPill';
import { styles } from './gameScreenStyles';

export default function CompactPlayerStrip({
  entries,
  activePlayerId,
}: {
  entries: LeaderboardEntry[];
  activePlayerId?: string;
}) {
  const playerStripRef = useRef<ScrollView | null>(null);
  const hasCenteredStripRef = useRef(false);
  const [stripViewportWidth, setStripViewportWidth] = useState(0);
  const activeIndex = entries.findIndex((entry) => entry.id === activePlayerId);

  useEffect(() => {
    if (!playerStripRef.current || stripViewportWidth <= 0 || activeIndex < 0) return;

    const centeredOffset = getCenteredLeaderboardOffset({
      activeIndex,
      entryCount: entries.length,
      viewportWidth: stripViewportWidth,
    });

    playerStripRef.current.scrollTo({
      x: centeredOffset,
      animated: hasCenteredStripRef.current,
    });

    hasCenteredStripRef.current = true;
  }, [activeIndex, entries.length, stripViewportWidth]);

  return (
    <ScrollView
      ref={playerStripRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      onLayout={(event) => setStripViewportWidth(event.nativeEvent.layout.width)}
      contentContainerStyle={styles.playerStripRow}
    >
      {entries.map((entry, index) => (
        <AnimatedLeaderboardPill
          key={entry.id}
          entry={entry}
          rank={index}
          activePlayerId={activePlayerId}
        />
      ))}
    </ScrollView>
  );
}
