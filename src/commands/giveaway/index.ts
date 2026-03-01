import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';

export const giveawayCommand = new SlashCommandBuilder()
  .setName('giveaway')
  .setDescription('Manage giveaways')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommand((subcommand) =>
    subcommand
      .setName('create')
      .setDescription('Create a giveaway')
      .addStringOption((option) => option.setName('name').setDescription('Giveaway title').setRequired(true))
      .addStringOption((option) => option.setName('duration').setDescription('Duration, such as 10m').setRequired(true))
      .addIntegerOption((option) => option.setName('winners').setDescription('Number of winners').setRequired(true).setMinValue(1).setMaxValue(20))
  )
  .addSubcommand((subcommand) => subcommand.setName('list').setDescription('List active giveaways'))
  .addSubcommand((subcommand) =>
    subcommand
      .setName('end')
      .setDescription('End a giveaway now')
      .addIntegerOption((option) => option.setName('id').setDescription('Giveaway database ID').setRequired(true))
  );
