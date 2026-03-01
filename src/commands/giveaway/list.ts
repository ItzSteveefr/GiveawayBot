import { PermissionFlagsBits, EmbedBuilder, type ChatInputCommandInteraction } from 'discord.js';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { giveaways } from '../../db/schema.js';

export const handleGiveawayList = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: 'You do not have permission to use this command.', ephemeral: true });
    return;
  }
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return;
  }
  const activeGiveaways = await db.query.giveaways.findMany({
    where: and(eq(giveaways.guildId, guildId), eq(giveaways.ended, false)),
    orderBy: asc(giveaways.endsAt),
    limit: 25
  });
  if (activeGiveaways.length === 0) {
    await interaction.reply({ content: 'No active giveaways.', ephemeral: true });
    return;
  }
  const lines = activeGiveaways.map((giveaway) => {
    const unix = Math.floor(giveaway.endsAt.getTime() / 1000);
    return `ID: ${giveaway.id} | **${giveaway.name}** | Winners: ${giveaway.winnerCount} | Ends: <t:${unix}:R>`;
  });
  const embed = new EmbedBuilder().setColor(0x57f287).setTitle('Active Giveaways').setDescription(lines.join('\n'));
  await interaction.reply({ embeds: [embed], ephemeral: true });
};
