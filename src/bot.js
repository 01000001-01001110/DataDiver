import { Client, Events, GatewayIntentBits, Partials } from 'discord.js';
import { REST, Routes } from 'discord.js';
import config from './utils/config.js';
import { sendLogToWebhook } from './utils/logger.js';
import { handleInteraction } from './handlers/interaction-handler.js';
import { cleanupAllFiles } from './utils/file-manager.js';
import { initLeaderboard } from './utils/leaderboard-service.js';

// Define the slash commands
const commands = [
  {
    name: 'scrape',
    description: 'Scrape a webpage and convert it to text or markdown',
  },
  {
    name: 'images',
    description: 'Extract all images from a webpage',
  },
  {
    name: 'leaderboard',
    description: 'View the top users by number of pages scraped',
  },
  {
    name: 'help',
    description: 'Show help information about the bot and its commands',
  }
];

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// Register slash commands
async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(config.token);

  try {
    console.log('Started refreshing application (/) commands.');
    
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands },
    );
    
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error('Error registering commands:', error);
  }
}

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, async () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
  
  // Initialize the leaderboard
  await initLeaderboard();
  
  // Log startup
  await sendLogToWebhook('Startup', client.user, 'Bot started successfully');
});

// Handle interactions (slash commands, buttons, modals)
client.on(Events.InteractionCreate, handleInteraction);

// Log errors
client.on('error', async error => {
  console.error('Discord client error:', error);
  await sendLogToWebhook('Client Error', client.user, 'Discord client error', error);
});

// Cleanup any remaining files on exit
process.on('SIGINT', async () => {
  console.log('Cleaning up files before exit...');
  await cleanupAllFiles(client.user);
  await sendLogToWebhook('Shutdown', client.user, 'Bot shutting down');
  process.exit(0);
});

// Initialize and start the bot
async function startBot() {
  try {
    // Register commands
    await registerCommands();
    
    // Login to Discord with your client's token
    await client.login(config.token);
  } catch (error) {
    console.error('Error starting bot:', error);
  }
}

startBot();
