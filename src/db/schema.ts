import { boolean, index, integer, pgTable, serial, text, timestamp, uniqueIndex, varchar } from 'drizzle-orm/pg-core';

export const giveaways = pgTable('giveaways', {
  id: serial('id').primaryKey(),
  guildId: varchar('guild_id', { length: 20 }).notNull(),
  channelId: varchar('channel_id', { length: 20 }).notNull(),
  messageId: varchar('message_id', { length: 20 }).notNull(),
  name: text('name').notNull(),
  winnerCount: integer('winner_count').notNull(),
  endsAt: timestamp('ends_at', { withTimezone: true }).notNull(),
  ended: boolean('ended').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export const giveawayEntries = pgTable('giveaway_entries', {
  id: serial('id').primaryKey(),
  giveawayId: integer('giveaway_id').notNull().references(() => giveaways.id, { onDelete: 'cascade' }),
  userId: varchar('user_id', { length: 20 }).notNull(),
  enteredAt: timestamp('entered_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  giveawayUserUnique: uniqueIndex('giveaway_entries_giveaway_id_user_id_unique').on(table.giveawayId, table.userId),
  giveawayIdIndex: index('giveaway_entries_giveaway_id_index').on(table.giveawayId)
}));
