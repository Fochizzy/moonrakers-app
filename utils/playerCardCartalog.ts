export type CardColor = "blue" | "green" | "purple" | "orange" | "yellow";

export type PlayerCardDefinition = {
  id: string;
  artIndex: number;
  color: CardColor;
  fileName: string;
};

export const PLAYER_CARD_CATALOG: PlayerCardDefinition[] = [
  { id: "card-00", artIndex: 0, color: "blue", fileName: "card-00.png" },
  { id: "card-01", artIndex: 1, color: "green", fileName: "card-01.png" },
  { id: "card-02", artIndex: 2, color: "purple", fileName: "card-02.png" },
  { id: "card-03", artIndex: 3, color: "orange", fileName: "card-03.png" },
  { id: "card-04", artIndex: 4, color: "yellow", fileName: "card-04.png" },

  { id: "card-05", artIndex: 5, color: "blue", fileName: "card-05.png" },
  { id: "card-06", artIndex: 6, color: "green", fileName: "card-06.png" },
  { id: "card-07", artIndex: 7, color: "purple", fileName: "card-07.png" },
  { id: "card-08", artIndex: 8, color: "orange", fileName: "card-08.png" },
  { id: "card-09", artIndex: 9, color: "yellow", fileName: "card-09.png" },

  { id: "card-10", artIndex: 10, color: "blue", fileName: "card-10.png" },
  { id: "card-11", artIndex: 11, color: "green", fileName: "card-11.png" },
  { id: "card-12", artIndex: 12, color: "purple", fileName: "card-12.png" },
  { id: "card-13", artIndex: 13, color: "orange", fileName: "card-13.png" },
  { id: "card-14", artIndex: 14, color: "yellow", fileName: "card-14.png" },

  { id: "card-15", artIndex: 15, color: "blue", fileName: "card-15.png" },
  { id: "card-16", artIndex: 16, color: "green", fileName: "card-16.png" },
  { id: "card-17", artIndex: 17, color: "purple", fileName: "card-17.png" },
  { id: "card-18", artIndex: 18, color: "orange", fileName: "card-18.png" },
  { id: "card-19", artIndex: 19, color: "yellow", fileName: "card-19.png" },

  { id: "card-20", artIndex: 20, color: "blue", fileName: "card-20.png" },
  { id: "card-21", artIndex: 21, color: "green", fileName: "card-21.png" },
  { id: "card-22", artIndex: 22, color: "purple", fileName: "card-22.png" },
  { id: "card-23", artIndex: 23, color: "orange", fileName: "card-23.png" },
  { id: "card-24", artIndex: 24, color: "yellow", fileName: "card-24.png" },

  { id: "card-25", artIndex: 25, color: "orange", fileName: "card-25.png" },
  { id: "card-26", artIndex: 26, color: "green", fileName: "card-26.png" },
  { id: "card-27", artIndex: 27, color: "purple", fileName: "card-27.png" },
  { id: "card-28", artIndex: 28, color: "orange", fileName: "card-28.png" },
  { id: "card-29", artIndex: 29, color: "yellow", fileName: "card-29.png" },
];

export function getCardByArtIndex(artIndex: number) {
  return PLAYER_CARD_CATALOG.find((card) => card.artIndex === artIndex) ?? null;
}

export function getCardsByColor(color: CardColor) {
  return PLAYER_CARD_CATALOG.filter((card) => card.color === color);
}