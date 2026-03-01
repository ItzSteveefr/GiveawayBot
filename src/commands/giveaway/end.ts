import { PermissionFlagsBits, type ChatInputCommandInteraction } from 'discord.js';
import { and, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { giveaways } from '../../db/schema.js';
import { endGiveaway } from '../../giveaway/logic.js';

export const handleGiveawayEnd = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  const id = interaction.options.getInteger('id', true);
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }
  const giveaway = await db.query.giveaways.findFirst({ where: and(eq(giveaways.id, id), eq(giveaways.guildId, guildId)) });
  if (!giveaway) {
    await interaction.reply({ content: `Giveaway with ID ${id} was not found.`, ephemeral: true });
    return;
  }
  if (giveaway.ended) {
    await interaction.reply({ content: `Giveaway with ID ${id} has already ended.`, ephemeral: true });
    return;
  }
  await endGiveaway(interaction.client, id);
  await interaction.reply({ content: `✅ Giveaway ${id} ended.`, ephemeral: true });
};
