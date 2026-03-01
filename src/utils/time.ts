const MAX_DURATION_MS = 2_592_000_000;

const multipliers: Record<string, number> = {
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000
};

export const parseDurationToMs = (input: string): number | null => {
  const value = input.trim().toLowerCase();
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  const unit = match[2];
  if (!Number.isInteger(amount) || amount <= 0) {
    return null;
  }
  const multiplier = multipliers[unit];
  const result = amount * multiplier;
  if (result > MAX_DURATION_MS) {
    return null;
  }
  return result;
};
