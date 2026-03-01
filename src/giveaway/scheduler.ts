export const giveawayTimers = new Map<number, NodeJS.Timeout>();

export const scheduleGiveaway = (giveawayId: number, delay: number, handler: (id: number) => Promise<void>): void => {
  const existing = giveawayTimers.get(giveawayId);
  if (existing) {
    clearTimeout(existing);
  }
  const timeout = setTimeout(() => {
    void handler(giveawayId);
  }, delay);
  giveawayTimers.set(giveawayId, timeout);
};

export const clearGiveawayTimer = (giveawayId: number): void => {
  const timeout = giveawayTimers.get(giveawayId);
  if (timeout) {
    clearTimeout(timeout);
    giveawayTimers.delete(giveawayId);
  }
};
