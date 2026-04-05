export function getActivePlayers(players: any[], selected: string[]) {
  return players.filter((p) => selected.includes(p.id));
}
