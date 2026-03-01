import { PermissionFlagsBits, type ChatInputCommandInteraction, TextChannel } from 'discord.js';
import { eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { giveaways } from '../../db/schema.js';
import { createGiveawayMessagePayload, endGiveaway } from '../../giveaway/logic.js';
import { scheduleGiveaway } from '../../giveaway/scheduler.js';
import { parseDurationToMs } from '../../utils/time.js';

export const handleGiveawayCreate = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }
  const name = interaction.options.getString('name', true);
  const durationInput = interaction.options.getString('duration', true);
  const winners = interaction.options.getInteger('winners', true);
  const durationMs = parseDurationToMs(durationInput);
  if (!durationMs) {
    await interaction.reply({ content: 'Invalid duration. Use formats like 30s, 10m, 2h, or 7d up to 30 days.', ephemeral: true });
    return;
  }
  const endsAt = new Date(Date.now() + durationMs);
  const inserted = await db.insert(giveaways).values({
    guildId,
    channelId: interaction.channelId,
    messageId: 'pending',
    name,
    winnerCount: winners,
    endsAt,
    ended: false
  }).returning({ id: giveaways.id });
  const giveawayId = inserted[0]?.id;
  if (!giveawayId) {
    throw new Error('Failed to create giveaway record');
  }
  const payload = createGiveawayMessagePayload(giveawayId, name, winners, endsAt, 0);
  if (!interaction.channel || !(interaction.channel instanceof TextChannel)) {
    return;
  }
  
  const message = await interaction.channel.send(payload);
  if (!message) {
    throw new Error('Failed to send giveaway message');
  }
  await db.update(giveaways).set({ messageId: message.id }).where(eq(giveaways.id, giveawayId));
  scheduleGiveaway(giveawayId, durationMs, async (id) => {
    await endGiveaway(interaction.client, id);
  });
  await interaction.reply({ content: `✅ Giveaway "${name}" created!`, ephemeral: true });
};
