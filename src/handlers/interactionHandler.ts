import { and, eq } from 'drizzle-orm';
import type { ButtonInteraction, ChatInputCommandInteraction, Interaction } from 'discord.js';
import { db } from '../db/client.js';
import { giveaways } from '../db/schema.js';
import { handleCommandInteraction } from './commandHandler.js';
import { incrementEntriesEmbed, insertGiveawayEntry } from '../giveaway/logic.js';

const handleEnterButton = async (interaction: ButtonInteraction): Promise<void> => {
  const [prefix, idRaw] = interaction.customId.split(':');
  if (prefix !== 'giveaway_enter') {
    return;
  }
  const giveawayId = Number(idRaw);
  if (!Number.isInteger(giveawayId) || giveawayId <= 0) {
    await interaction.reply({ content: 'Invalid giveaway.', ephemeral: true });
    return;
  }
  const giveaway = await db.query.giveaways.findFirst({
    where: and(eq(giveaways.id, giveawayId), eq(giveaways.ended, false))
  });
  if (!giveaway) {
    await interaction.reply({ content: 'This giveaway has already ended.', ephemeral: true });
    return;
  }
  if (giveaway.endsAt.getTime() <= Date.now()) {
    await interaction.reply({ content: 'This giveaway has already ended.', ephemeral: true });
    return;
  }
  const status = await insertGiveawayEntry(giveawayId, interaction.user.id);
  if (status === 'duplicate') {
    await interaction.reply({ content: 'You are already entered in this giveaway.', ephemeral: true });
    return;
  }
  await interaction.reply({ content: 'You have successfully entered the giveaway.', ephemeral: true });
  await incrementEntriesEmbed(interaction.client, giveawayId);
};

export const handleInteraction = async (interaction: Interaction): Promise<void> => {
  try {
    if (interaction.isChatInputCommand()) {
      await handleCommandInteraction(interaction as ChatInputCommandInteraction);
      return;
    }
    if (interaction.isButton()) {
      await handleEnterButton(interaction);
    }
  } catch (error) {
    console.error('Interaction handling error', error);
    const payload = { content: '⚠️ An error occurred. Please try again.', ephemeral: true };
    if (interaction.isRepliable()) {
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => {
          return;
        });
      } else {
        await interaction.reply(payload).catch(() => {
          return;
        });
      }
    }
  }
};
