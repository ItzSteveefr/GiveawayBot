import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { giveawayCommand } from './commands/giveaway/index.js';

const token = process.env.DISCORD_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;

if (!token) {
  console.error('Missing required environment variable: DISCORD_TOKEN');
  process.exit(1);
}
if (!clientId) {
  console.error('Missing required environment variable: DISCORD_CLIENT_ID');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(token);

const run = async (): Promise<void> => {
  await rest.put(Routes.applicationCommands(clientId), {
    body: [giveawayCommand.toJSON()]
  });
  console.log('Slash commands deployed.');
};

run().catch((error) => {
  console.error('Failed to deploy commands', error);
  process.exit(1);
});
