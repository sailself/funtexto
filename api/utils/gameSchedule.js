export const DEFAULT_GAME_GENERATION_INTERVAL = '30m';

const INTERVAL_MULTIPLIERS = {
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export function parseGameGenerationIntervalMs(value = DEFAULT_GAME_GENERATION_INTERVAL) {
  const normalizedValue = String(value).trim().toLowerCase();
  const match = /^(\d+)([mhd])$/.exec(normalizedValue);

  if (!match) {
    return 30 * 60 * 1000;
  }

  const [, amount, unit] = match;
  return Number(amount) * INTERVAL_MULTIPLIERS[unit];
}
