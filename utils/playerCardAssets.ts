import type { ImageSourcePropType } from 'react-native';

export const PLAYER_CARD_IMAGE_BY_FILE: Record<string, ImageSourcePropType> = {
  'card-00.png': require('../assets/images/player-cards/card-00.png'),
  'card-01.png': require('../assets/images/player-cards/card-01.png'),
  'card-02.png': require('../assets/images/player-cards/card-02.png'),
  'card-03.png': require('../assets/images/player-cards/card-03.png'),
  'card-04.png': require('../assets/images/player-cards/card-04.png'),
  'card-05.png': require('../assets/images/player-cards/card-05.png'),
  'card-06.png': require('../assets/images/player-cards/card-06.png'),
  'card-07.png': require('../assets/images/player-cards/card-07.png'),
  'card-08.png': require('../assets/images/player-cards/card-08.png'),
  'card-09.png': require('../assets/images/player-cards/card-09.png'),
  'card-10.png': require('../assets/images/player-cards/card-10.png'),
  'card-11.png': require('../assets/images/player-cards/card-11.png'),
  'card-12.png': require('../assets/images/player-cards/card-12.png'),
  'card-13.png': require('../assets/images/player-cards/card-13.png'),
  'card-14.png': require('../assets/images/player-cards/card-14.png'),
  'card-15.png': require('../assets/images/player-cards/card-15.png'),
  'card-16.png': require('../assets/images/player-cards/card-16.png'),
  'card-17.png': require('../assets/images/player-cards/card-17.png'),
  'card-18.png': require('../assets/images/player-cards/card-18.png'),
  'card-19.png': require('../assets/images/player-cards/card-19.png'),
  'card-20.png': require('../assets/images/player-cards/card-20.png'),
  'card-21.png': require('../assets/images/player-cards/card-21.png'),
  'card-22.png': require('../assets/images/player-cards/card-22.png'),
  'card-23.png': require('../assets/images/player-cards/card-23.png'),
  'card-24.png': require('../assets/images/player-cards/card-24.png'),
  'card-25.png': require('../assets/images/player-cards/card-25.png'),
  'card-26.png': require('../assets/images/player-cards/card-26.png'),
  'card-27.png': require('../assets/images/player-cards/card-27.png'),
  'card-28.png': require('../assets/images/player-cards/card-28.png'),
  'card-29.png': require('../assets/images/player-cards/card-29.png'),
};

export type PlayerCardFile = keyof typeof PLAYER_CARD_IMAGE_BY_FILE;

export const PLAYER_CARD_FILES = Object.keys(
  PLAYER_CARD_IMAGE_BY_FILE,
).sort() as PlayerCardFile[];

export function isValidPlayerCardAssetIndex(
  value: unknown,
): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value < PLAYER_CARD_FILES.length
  );
}

export function getPlayerCardSourceByArtIndex(
  artIndex?: number | null,
) {
  const normalizedIndex = isValidPlayerCardAssetIndex(artIndex)
    ? artIndex
    : 0;
  const fileName =
    PLAYER_CARD_FILES[normalizedIndex] ?? PLAYER_CARD_FILES[0] ?? "card-00.png";
  return PLAYER_CARD_IMAGE_BY_FILE[fileName];
}
