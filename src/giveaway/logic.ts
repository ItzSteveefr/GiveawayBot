import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, type TextBasedChannel } from 'discord.js';
import { and, count, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { giveawayEntries, giveaways } from '../db/schema.js';
import { clearGiveawayTimer, scheduleGiveaway } from './scheduler.js';
import type { Client } from 'discord.js';

export const createGiveawayMessagePayload = (id: number, name: string, winnerCount: number, endsAt: Date, entriesCount: number) => {
  const unix = Math.floor(endsAt.getTime() / 1000);
  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle(`🎉 Giveaway: ${name}`)
    .addFields(
      { name: 'Winners', value: `${winnerCount}`, inline: true },
      { name: 'Ends', value: `<t:${unix}:R>`, inline: true },
      { name: 'Entries', value: `${entriesCount}`, inline: true }
    )
    .setFooter({ text: `Giveaway ID: ${id} • Ends at` })
    .setTimestamp(endsAt);
  const button = new ButtonBuilder()
    .setCustomId(`giveaway_enter:${id}`)
    .setLabel('Enter Giveaway 🎟️')
    .setStyle(ButtonStyle.Success);
  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(button);
  return { embeds: [embed], components: [row] };
};

export const updateEndedGiveawayMessage = async (client: Client, giveawayId: number): Promise<void> => {
  const giveaway = await db.query.giveaways.findFirst({ where: eq(giveaways.id, giveawayId) });
  if (!giveaway) {
    return;
  }
  const entries = await db.select({ userId: giveawayEntries.userId }).from(giveawayEntries).where(eq(giveawayEntries.giveawayId, giveawayId));
  const finalCount = entries.length;
  const winnerAmount = Math.min(giveaway.winnerCount, finalCount);
  const winnerIds = winnerAmount > 0
    ? entries.sort(() => Math.random() - 0.5).slice(0, winnerAmount).map((entry) => entry.userId)
    : [];
  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return;
  }
  const textChannel = channel as TextBasedChannel;
  const message = await textChannel.messages.fetch(giveaway.messageId).catch(() => null);
  const unix = Math.floor(giveaway.endsAt.getTime() / 1000);
  const endedEmbed = new EmbedBuilder()
    .setColor(0xed4245)
    .setTitle(`🎉 Giveaway Ended: ${giveaway.name}`)
    .addFields(
      { name: 'Winners', value: `${giveaway.winnerCount}`, inline: true },
      { name: 'Ended', value: `<t:${unix}:R>`, inline: true },
      { name: 'Entries', value: `${finalCount}`, inline: true }
    )
    .setFooter({ text: `Giveaway ID: ${giveaway.id} • Ended at` })
    .setTimestamp(giveaway.endsAt);
  if (message) {
    await message.edit({ embeds: [endedEmbed], components: [] }).catch((error: unknown) => {
      console.error('Failed to edit ended giveaway message', error);
    });
    if (winnerIds.length > 0) {
      const mentions = winnerIds.map((id) => `<@${id}>`).join(', ');
      await message.reply(`🎉 Congratulations ${mentions}! You won **${giveaway.name}**!`).catch((error: unknown) => {
        console.error('Failed to post winner reply', error);
      });
    } else {
      await message.reply(`Giveaway ended for **${giveaway.name}**. No winners selected.`).catch((error: unknown) => {
        console.error('Failed to post no-winner reply', error);
      });
    }
  }
};

export const endGiveaway = async (client: Client, giveawayId: number): Promise<void> => {
  try {
    const giveaway = await db.query.giveaways.findFirst({ where: eq(giveaways.id, giveawayId) });
    if (!giveaway || giveaway.ended) {
      clearGiveawayTimer(giveawayId);
      return;
    }
    clearGiveawayTimer(giveawayId);
    await updateEndedGiveawayMessage(client, giveawayId);
    await db.update(giveaways).set({ ended: true }).where(eq(giveaways.id, giveawayId));
    console.log(`Giveaway ${giveawayId} ended.`);
  } catch (error) {
    await db.update(giveaways).set({ ended: true }).where(eq(giveaways.id, giveawayId)).catch(() => {
      return;
    });
    console.error('Error ending giveaway', error);
  }
};

export const restoreGiveawayTimers = async (client: Client): Promise<void> => {
  const active = await db.query.giveaways.findMany({ where: eq(giveaways.ended, false) });
  for (const giveaway of active) {
    const delay = giveaway.endsAt.getTime() - Date.now();
    if (delay <= 0) {
      void endGiveaway(client, giveaway.id);
      continue;
    }
    scheduleGiveaway(giveaway.id, delay, async (id) => {
      await endGiveaway(client, id);
    });
  }
  console.log(`Restored ${active.length} giveaway timers.`);
};

export const getGiveawayEntryCount = async (giveawayId: number): Promise<number> => {
  const result = await db.select({ value: count() }).from(giveawayEntries).where(eq(giveawayEntries.giveawayId, giveawayId));
  return result[0]?.value ?? 0;
};

export const insertGiveawayEntry = async (giveawayId: number, userId: string): Promise<'inserted' | 'duplicate'> => {
  try {
    await db.insert(giveawayEntries).values({ giveawayId, userId });
    return 'inserted';
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error) {
      const maybeCode = (error as { code?: string }).code;
      if (maybeCode === '23505') {
        return 'duplicate';
      }
    }
    throw error;
  }
};

export const incrementEntriesEmbed = async (client: Client, giveawayId: number): Promise<void> => {
  const giveaway = await db.query.giveaways.findFirst({ where: and(eq(giveaways.id, giveawayId), eq(giveaways.ended, false)) });
  if (!giveaway) {
    return;
  }
  const countEntries = await getGiveawayEntryCount(giveawayId);
  const channel = await client.channels.fetch(giveaway.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return;
  }
  const message = await channel.messages.fetch(giveaway.messageId).catch(() => null);
  if (!message) {
    return;
  }
  const payload = createGiveawayMessagePayload(giveaway.id, giveaway.name, giveaway.winnerCount, giveaway.endsAt, countEntries);
  await message.edit(payload).catch((error: unknown) => {
    console.error('Failed to refresh giveaway entries', error);
  });
};
