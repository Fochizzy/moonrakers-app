export const APP_ICONS = {
  addRemoves: require("../assets/icons/add_remove.png"),
  charts: require("../assets/icons/charts.png"),
  compare: require("../assets/icons/compare.png"),
  definitions: require("../assets/icons/definitions.png"),
  elo: require("../assets/icons/elo.png"),
  fullProfile: require("../assets/icons/full_profile.png"),
  history: require("../assets/icons/history.png"),
  playerCard: require("../assets/icons/player_card.png"),
  statistics: require("../assets/icons/statistics.png"),
} as const;

export type AppIconKey = keyof typeof APP_ICONS;