export const APP_ICONS = {
  addRemoves: require("../assets/icons/add_remove.png"),
  billBendo: require("../assets/icons/Bill_Bendo.png"),
  charts: require("../assets/icons/charts.png"),
  compare: require("../assets/icons/compare.png"),
  damage: require("../assets/icons/damage.png"),
  definitions: require("../assets/icons/definitions.png"),
  elo: require("../assets/icons/elo.png"),
  fullProfile: require("../assets/icons/full_profile.png"),
  history: require("../assets/icons/history.png"),
  miss: require("../assets/icons/miss.png"),
  orangePerson: require("../assets/icons/orange_person.png"),
  playerCard: require("../assets/icons/player_card.png"),
  reactor: require("../assets/icons/reactor.png"),
  shield: require("../assets/icons/shield.png"),
  ships: require("../assets/icons/ships.png"),
  statistics: require("../assets/icons/statistics.png"),
  thruster: require("../assets/icons/thruster.png"),
} as const;

export type AppIconKey = keyof typeof APP_ICONS;
