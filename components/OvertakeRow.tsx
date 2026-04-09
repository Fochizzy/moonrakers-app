useEffect(() => {
  const prev = prevRankingRef.current;
  const current = ranking;

  const mapPrev: Record<string, number> = {};
  prev.forEach((p, i) => {
    mapPrev[p.playerId] = i;
  });

  const newOvertakes: Record<string, string> = {};

  current.forEach((p, newIndex) => {
    const oldIndex = mapPrev[p.playerId];

    if (oldIndex === undefined) return;

    if (newIndex < oldIndex) {
      newOvertakes[p.playerId] = 'up';
    } else if (newIndex > oldIndex) {
      newOvertakes[p.playerId] = 'down';
    }
  });

  setOvertakes(newOvertakes);
  prevRankingRef.current = current;
}, [ranking]);


