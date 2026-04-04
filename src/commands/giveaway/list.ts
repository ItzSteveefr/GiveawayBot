import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  type ButtonInteraction,
  type ChatInputCommandInteraction
} from 'discord.js';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../db/client.js';
import { giveaways } from '../../db/schema.js';

const GIVEAWAY_LIST_BUTTON_PREFIX = 'giveaway_list';
const GIVEAWAY_LIST_DESCRIPTION_LIMIT = 3800;
const GIVEAWAY_LIST_MAX_NAME_LENGTH = 1800;

type GiveawayListEntry = {
  id: number;
  name: string;
  winnerCount: number;
  endsAt: Date;
  createdAt: Date;
};

type GiveawayListDirection = 'previous' | 'next';

const trimGiveawayName = (name: string): string => {
  if (name.length <= GIVEAWAY_LIST_MAX_NAME_LENGTH) {
    return name;
  }
  return `${name.slice(0, GIVEAWAY_LIST_MAX_NAME_LENGTH - 3)}...`;
};

const formatGiveawayListLine = (giveaway: GiveawayListEntry): string => {
  const unix = Math.floor(giveaway.endsAt.getTime() / 1000);
  return `ID: ${giveaway.id} | **${trimGiveawayName(giveaway.name)}** | Winners: ${giveaway.winnerCount} | Ends: <t:${unix}:R>`;
};

const normalizePageIndex = (pageIndex: number, totalPages: number): number => {
  if (totalPages <= 0) {
    return 0;
  }
  return ((pageIndex % totalPages) + totalPages) % totalPages;
};

export const getWrappedGiveawayPageIndex = (
  currentPage: number,
  direction: GiveawayListDirection,
  totalPages: number
): number => {
  const normalizedPage = normalizePageIndex(currentPage, totalPages);
  if (direction === 'previous') {
    return normalizePageIndex(normalizedPage - 1, totalPages);
  }
  return normalizePageIndex(normalizedPage + 1, totalPages);
};

export const buildGiveawayListPages = (activeGiveaways: GiveawayListEntry[]): string[] => {
  const sortedGiveaways = [...activeGiveaways].sort((left, right) => {
    const createdAtDelta = right.createdAt.getTime() - left.createdAt.getTime();
    if (createdAtDelta !== 0) {
      return createdAtDelta;
    }
    return right.id - left.id;
  });
  const pages: string[] = [];
  let currentLines: string[] = [];
  let currentLength = 0;

  for (const giveaway of sortedGiveaways) {
    const line = formatGiveawayListLine(giveaway);
    const nextLength = currentLines.length === 0 ? line.length : currentLength + line.length + 1;

    if (currentLines.length > 0 && nextLength > GIVEAWAY_LIST_DESCRIPTION_LIMIT) {
      pages.push(currentLines.join('\n'));
      currentLines = [line];
      currentLength = line.length;
      continue;
    }

    currentLines.push(line);
    currentLength = nextLength;
  }

  if (currentLines.length > 0) {
    pages.push(currentLines.join('\n'));
  }

  return pages;
};

const createGiveawayListComponents = (userId: string, pageIndex: number) => {
  const previousButton = new ButtonBuilder()
    .setCustomId(`${GIVEAWAY_LIST_BUTTON_PREFIX}:${userId}:${pageIndex}:previous`)
    .setLabel('Previous')
    .setStyle(ButtonStyle.Secondary);
  const nextButton = new ButtonBuilder()
    .setCustomId(`${GIVEAWAY_LIST_BUTTON_PREFIX}:${userId}:${pageIndex}:next`)
    .setLabel('Next')
    .setStyle(ButtonStyle.Secondary);

  return [new ActionRowBuilder<ButtonBuilder>().addComponents(previousButton, nextButton)];
};

const buildGiveawayListResponse = (activeGiveaways: GiveawayListEntry[], userId: string, pageIndex: number) => {
  const pages = buildGiveawayListPages(activeGiveaways);
  const safePageIndex = normalizePageIndex(pageIndex, pages.length);
  const embed = new EmbedBuilder()
    .setColor(0x57f287)
    .setTitle('Active Giveaways')
    .setDescription(pages[safePageIndex])
    .setFooter({ text: `Page ${safePageIndex + 1}/${pages.length} • ${activeGiveaways.length} active giveaways` });

  return {
    embeds: [embed],
    components: createGiveawayListComponents(userId, safePageIndex)
  };
};

const fetchActiveGiveaways = async (guildId: string): Promise<GiveawayListEntry[]> => {
  return db.query.giveaways.findMany({
    where: and(eq(giveaways.guildId, guildId), eq(giveaways.ended, false)),
    orderBy: desc(giveaways.createdAt)
  });
};

const parseGiveawayListButton = (
  customId: string
): { userId: string; pageIndex: number; direction: GiveawayListDirection } | null => {
  const [prefix, userId, pageIndexRaw, directionRaw] = customId.split(':');
  if (prefix !== GIVEAWAY_LIST_BUTTON_PREFIX || !userId || !pageIndexRaw) {
    return null;
  }
  if (directionRaw !== 'previous' && directionRaw !== 'next') {
    return null;
  }
  const pageIndex = Number(pageIndexRaw);
  if (!Number.isInteger(pageIndex) || pageIndex < 0) {
    return null;
  }
  return { userId, pageIndex, direction: directionRaw };
};

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
  const activeGiveaways = await fetchActiveGiveaways(guildId);
  if (activeGiveaways.length === 0) {
    await interaction.reply({ content: 'No active giveaways.', ephemeral: true });
    return;
  }
  await interaction.reply({ ...buildGiveawayListResponse(activeGiveaways, interaction.user.id, 0), ephemeral: true });
};

export const handleGiveawayListPagination = async (interaction: ButtonInteraction): Promise<boolean> => {
  const parsedButton = parseGiveawayListButton(interaction.customId);
  if (!parsedButton) {
    return false;
  }
  if (interaction.user.id !== parsedButton.userId) {
    await interaction.reply({ content: 'This pagination control belongs to another user.', ephemeral: true });
    return true;
  }
  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({ content: 'This command can only be used in a server.', ephemeral: true });
    return true;
  }
  const activeGiveaways = await fetchActiveGiveaways(guildId);
  if (activeGiveaways.length === 0) {
    await interaction.update({ content: 'No active giveaways.', embeds: [], components: [] });
    return true;
  }
  const pages = buildGiveawayListPages(activeGiveaways);
  const pageIndex = getWrappedGiveawayPageIndex(parsedButton.pageIndex, parsedButton.direction, pages.length);
  await interaction.update(buildGiveawayListResponse(activeGiveaways, interaction.user.id, pageIndex));
  return true;
};
