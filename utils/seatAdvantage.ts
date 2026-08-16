/**
 * Seat advantage spread — how much the best-performing seat outperforms the
 * worst-performing one.
 *
 * This replaces the Pearson correlation that used to back `turnOrderWinCorrelation`.
 * Pearson treats the seat number as a continuous axis, so it can only see a
 * monotonic trend: a table where seat 2 never wins while seats 1, 3 and 4 all do
 * nets out to r ~= 0 and reads as "seat doesn't matter", which is the opposite of
 * the truth. Grouping by seat and comparing the best and worst seat catches those
 * non-monotonic effects.
 *
 * The result keeps the sign convention every seat surface already assumes:
 * negative means earlier seats win more often, positive means later seats do.
 */

export const MIN_SEAT_APPEARANCES = 3;

export type SeatWinSample = {
  seat: number;
  won: number;
};

type SeatBucket = {
  seat: number;
  appearances: number;
  wins: number;
};

function isFinitePositiveSeat(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1;
}

/**
 * Buckets samples by whole seat number. Group-level callers can pass a fractional
 * average seat; rounding keeps those in the nearest lane rather than dropping them.
 */
function buildSeatBuckets(samples: SeatWinSample[], minAppearances: number) {
  const buckets = new Map<number, SeatBucket>();

  for (const sample of samples) {
    const rawSeat = sample?.seat;
    if (!isFinitePositiveSeat(rawSeat)) continue;

    const won = Number(sample?.won);
    if (!Number.isFinite(won)) continue;

    const seat = Math.round(rawSeat);
    const bucket = buckets.get(seat) ?? { seat, appearances: 0, wins: 0 };
    bucket.appearances += 1;
    bucket.wins += won > 0 ? 1 : 0;
    buckets.set(seat, bucket);
  }

  return [...buckets.values()]
    .filter((bucket) => bucket.appearances >= Math.max(1, minAppearances))
    .sort((left, right) => left.seat - right.seat);
}

/**
 * Returns a value in [-1, 1]. 0 means no measurable seat effect, or not enough
 * data: fewer than two seats cleared `minAppearances`.
 */
export function computeSeatAdvantageSpread(
  samples: SeatWinSample[],
  minAppearances: number = MIN_SEAT_APPEARANCES
): number {
  if (!Array.isArray(samples) || samples.length === 0) return 0;

  const buckets = buildSeatBuckets(samples, minAppearances);
  if (buckets.length < 2) return 0;

  // Buckets are seat-ascending, so a strict comparison keeps the lowest seat on ties.
  const firstBucket = buckets[0];
  if (!firstBucket) return 0;

  let best = firstBucket;
  let worst = firstBucket;
  let bestRate = best.wins / best.appearances;
  let worstRate = bestRate;

  for (const bucket of buckets) {
    const rate = bucket.wins / bucket.appearances;
    if (rate > bestRate) {
      best = bucket;
      bestRate = rate;
    }
    if (rate < worstRate) {
      worst = bucket;
      worstRate = rate;
    }
  }

  if (best.seat === worst.seat) return 0;

  const spread = bestRate - worstRate;
  return best.seat < worst.seat ? -spread : spread;
}

/** Convenience wrapper for the paired-array shape most callers already build. */
export function computeSeatAdvantageSpreadFromArrays(
  seats: number[],
  wins: number[],
  minAppearances: number = MIN_SEAT_APPEARANCES
): number {
  if (!Array.isArray(seats) || !Array.isArray(wins)) return 0;

  const length = Math.min(seats.length, wins.length);
  const samples: SeatWinSample[] = [];

  for (let index = 0; index < length; index += 1) {
    const seat = seats[index];
    const won = wins[index];
    if (seat === undefined || won === undefined) continue;
    samples.push({ seat, won });
  }

  return computeSeatAdvantageSpread(samples, minAppearances);
}
