import { getPlayerBaseColor } from '@/utils/colors';

export type DatasetPoint = {
  x: number;
  y: number;
};

export type BaseDataset = {
  label: string;
  color: string;
  prestige: DatasetPoint[];
  points: DatasetPoint[];
};

type RoundStat = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  contracts?: number;
  assists?: number;
  failures?: number;
};

type RoundPlayer = {
  id: string;
  name: string;
  color?: string;
  rounds?: RoundStat[];
};

type HistoryTotals = {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  score?: number;
  assists?: number;
  failures?: number;
  contracts?: number;
};

type HistoryPlayer = {
  id: string;
  name: string;
  color?: string;
};

type Game = {
  id?: string;
  players?: HistoryPlayer[];
  totals?: Record<string, HistoryTotals>;
};

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getTotalPrestige(value?: {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
}): number {
  const explicit = value?.totalPrestige ?? value?.prestige;
  if (typeof explicit === 'number' && Number.isFinite(explicit)) {
    return explicit;
  }

  return toNumber(value?.directPrestige) + toNumber(value?.assistPrestigeReceived);
}

function getSecondaryScoreValue(value?: {
  prestige?: number;
  totalPrestige?: number;
  directPrestige?: number;
  assistPrestigeReceived?: number;
  contracts?: number;
  assists?: number;
  failures?: number;
}): number {
  const totalPrestige = getTotalPrestige(value);

  return (
    totalPrestige +
    toNumber(value?.contracts) * 5 +
    toNumber(value?.assists) * 3 -
    toNumber(value?.failures) * 4
  );
}

export const toCumulative = (
  data: readonly DatasetPoint[]
): DatasetPoint[] => {
  const len = data.length;
  const out = new Array<DatasetPoint>(len);

  let total = 0;

  for (let i = 0; i < len; i++) {
    total += toNumber(data[i]?.y);
    out[i] = { x: data[i].x, y: total };
  }

  return out;
};

export const buildRoundDatasets = (
  players: readonly RoundPlayer[]
): BaseDataset[] => {
  const len = players.length;
  const result = new Array<BaseDataset>(len);

  for (let i = 0; i < len; i++) {
    const player = players[i];
    const rounds = Array.isArray(player.rounds) ? player.rounds : [];
    const roundLen = rounds.length;

    const prestige = new Array<DatasetPoint>(roundLen);
    const points = new Array<DatasetPoint>(roundLen);

    for (let j = 0; j < roundLen; j++) {
      const round = rounds[j];
      const x = j + 1;

      prestige[j] = {
        x,
        y: getTotalPrestige(round),
      };

      points[j] = {
        x,
        y: getSecondaryScoreValue(round),
      };
    }

    result[i] = {
      label: player.name,
      color: getPlayerBaseColor(player.color),
      prestige,
      points,
    };
  }

  return result;
};

export const buildHistoryDatasets = (
  games: readonly Game[]
): BaseDataset[] => {
  const datasets: Record<string, BaseDataset> = Object.create(null);

  for (let gIdx = 0; gIdx < games.length; gIdx++) {
    const game = games[gIdx];
    const players = Array.isArray(game.players) ? game.players : [];
    const totals = game.totals ?? {};

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const playerTotals = totals[player.id] ?? {};

      let dataset = datasets[player.id];

      if (!dataset) {
        dataset = datasets[player.id] = {
          label: player.name,
          color: getPlayerBaseColor(player.color),
          prestige: [],
          points: [],
        };
      }

      const x = gIdx + 1;

      dataset.prestige.push({
        x,
        y: getTotalPrestige(playerTotals),
      });

      dataset.points.push({
        x,
        y: getSecondaryScoreValue(playerTotals),
      });
    }
  }

  return Object.values(datasets);
};
