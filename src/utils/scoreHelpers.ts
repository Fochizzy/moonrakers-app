export function sumScores(totals: any) {
  return Object.values(totals).reduce(
    (acc: number, t: any) => acc + (t.score ?? 0),
    0
  );
}
