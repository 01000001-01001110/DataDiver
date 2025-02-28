import { InteractionType } from 'discord.js';
import { handleScrapeCommand, handleScrapeModalSubmit } from '../commands/scrape-command.js';
import { handleImagesCommand, handleImagesModalSubmit } from '../commands/images-command.js';
import { handleLeaderboardCommand } from '../commands/leaderboard-command.js';
import { handleHelpCommand } from '../commands/help-command.js';
import { handleButtonInteraction } from './button-handler.js';
import { sendLogToWebhook } from '../utils/logger.js';

/**
 * Handle all Discord interactions
 * @param {Object} interaction - The Discord interaction
 * @returns {Promise<void>}
 */
export async function handleInteraction(interaction) {
  try {
    console.log(`Handling interaction: ${interaction.type} - ${interaction.commandName || interaction.customId || 'unknown'}`);
    
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      console.log(`Processing slash command: ${interaction.commandName}`);
      
      if (interaction.commandName === 'scrape') {
        await handleScrapeCommand(interaction);
      } else if (interaction.commandName === 'images') {
        await handleImagesCommand(interaction);
      } else if (interaction.commandName === 'leaderboard') {
        console.log('Handling leaderboard command');
        await handleLeaderboardCommand(interaction);
      } else if (interaction.commandName === 'help') {
        console.log('Handling help command');
        await handleHelpCommand(interaction);
      } else {
        console.log(`Unknown command: ${interaction.commandName}`);
      }
    }
    
    // Handle modal submissions
    else if (interaction.type === InteractionType.ModalSubmit) {
      console.log(`Processing modal submission: ${interaction.customId}`);
      
      if (interaction.customId === 'scrapeModal') {
        await handleScrapeModalSubmit(interaction);
      } else if (interaction.customId === 'imagesModal') {
        await handleImagesModalSubmit(interaction);
      } else {
        console.log(`Unknown modal: ${interaction.customId}`);
      }
    }
    
    // Handle button interactions
    else if (interaction.isButton()) {
      console.log(`Processing button interaction: ${interaction.customId}`);
      await handleButtonInteraction(interaction);
    }
    
    // Log unhandled interaction types
    else {
      console.log(`Unhandled interaction type: ${interaction.type}`);
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    
    // Log the error
    await sendLogToWebhook('Interaction Error', interaction.user, 'Error handling interaction', error);
    
    // Try to respond to the interaction if it hasn't been acknowledged yet
    try {
      if (!interaction.replied && !interaction.deferred) {
        console.log('Attempting to reply to unacknowledged interaction');
        await interaction.reply({ 
          content: 'There was an error processing your request. Please try again later.',
          ephemeral: true 
        });
      } else if (interaction.deferred) {
        console.log('Attempting to edit reply for deferred interaction');
        await interaction.editReply({ 
          content: 'There was an error processing your request. Please try again later.',
          ephemeral: true 
        });
      } else {
        console.log('Interaction already acknowledged, cannot send error message');
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
}

export default {
  handleInteraction
};
