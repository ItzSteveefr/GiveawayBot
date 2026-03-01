import 'dotenv/config';
import { Client, GatewayIntentBits } from 'discord.js';
import { giveaways } from './db/schema.js';
import { handleInteraction } from './handlers/interactionHandler.js';
import { restoreGiveawayTimers } from './giveaway/logic.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const databaseUrl = process.env.DATABASE_URL;

if (!token) {
  console.error('Missing required environment variable: DISCORD_TOKEN');
  process.exit(1);
}
if (!clientId) {
  console.error('Missing required environment variable: DISCORD_CLIENT_ID');
  process.exit(1);
}
if (!databaseUrl) {
  console.error('Missing required environment variable: DATABASE_URL');
  process.exit(1);
}

import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db } from "./db/client.js";

await migrate(db, {
  migrationsFolder: "./src/db/migrations",
});

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.on('ready', async () => {
  if (!client.user) {
    return;
  }
  console.log(`Logged in as ${client.user.tag}`);
  await db.select({ id: giveaways.id }).from(giveaways).limit(1);
  await restoreGiveawayTimers(client);
});

client.on('interactionCreate', async (interaction) => {
  await handleInteraction(interaction);
});

client.login(token).catch((error) => {
  console.error('Failed to login', error);
  process.exit(1);
});
