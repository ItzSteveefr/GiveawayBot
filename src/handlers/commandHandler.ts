import type { ChatInputCommandInteraction } from 'discord.js';
import { handleGiveawayCreate } from '../commands/giveaway/create.js';
import { handleGiveawayEnd } from '../commands/giveaway/end.js';
import { handleGiveawayList } from '../commands/giveaway/list.js';

export const handleCommandInteraction = async (interaction: ChatInputCommandInteraction): Promise<void> => {
  if (interaction.commandName !== 'giveaway') {
    return;
  }
  const subcommand = interaction.options.getSubcommand();
  if (subcommand === 'create') {
    await handleGiveawayCreate(interaction);
    return;
  }
  if (subcommand === 'list') {
    await handleGiveawayList(interaction);
    return;
  }
  if (subcommand === 'end') {
    await handleGiveawayEnd(interaction);
  }
};
