import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { convertToMarkdown } from '../utils/converter.js';
import { scheduleFileForDeletion } from '../utils/file-manager.js';
import { sendLogToWebhook } from '../utils/logger.js';
import { sendMultipleFiles } from '../utils/message-sender.js';
import { storeUserScrapedFiles } from '../utils/user-data.js';
import { recordPageScrape } from '../utils/leaderboard-service.js';

/**
 * Handle the /scrape command
 * @param {Object} interaction - The Discord interaction
 * @returns {Promise<void>}
 */
export async function handleScrapeCommand(interaction) {
  // Log command usage
  await sendLogToWebhook('Command', interaction.user, 'Used /scrape command');
  
  try {
    // Create the modal
    const modal = new ModalBuilder()
      .setCustomId('scrapeModal')
      .setTitle('Webpage Scraper');
    
    // Add components to modal
    const urlInput = new TextInputBuilder()
      .setCustomId('urlInput')
      .setLabel('URL to scrape')
      .setStyle(TextInputStyle.Short)
      .setPlaceholder('https://example.com')
      .setRequired(true);
    
    const formatRow = new ActionRowBuilder().addComponents(urlInput);
    
    modal.addComponents(formatRow);
    
    // Show the modal
    await interaction.showModal(modal);
  } catch (modalError) {
    console.error('Error showing modal:', modalError);
    
    // Try to respond with an error message
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `Error showing modal: ${modalError.message}. Please try again.`,
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
    
    // Log the error
    await sendLogToWebhook('Modal Error', interaction.user, 'Error showing scrape modal', modalError);
  }
}

/**
 * Handle the scrape modal submission
 * @param {Object} interaction - The Discord interaction
 * @returns {Promise<void>}
 */
export async function handleScrapeModalSubmit(interaction) {
  // Get the data from the modal
  const url = interaction.fields.getTextInputValue('urlInput');
  
  // Log URL submission
  await sendLogToWebhook('URL Submission', interaction.user, `Submitted URL: ${url}`);
  
  try {
    // Acknowledge the interaction
    await interaction.reply({ content: `Scraping ${url}... This may take a moment.`, ephemeral: true });
    
    // Create a unique output file name based on timestamp
    const timestamp = Date.now();
    const outputFile = `output_${timestamp}.md`;
    
    // Convert the URL to markdown
    try {
      const result = await convertToMarkdown(url, outputFile);
      
      if (result.success) {
        // Store the output files for this user
        storeUserScrapedFiles(interaction.user.id, url, result.outputFiles, timestamp);
        
        // Get the server ID (or use 'global' for DMs)
        const serverId = interaction.guild ? interaction.guild.id : 'global';
        
        // Record the page scrape for the leaderboard
        await recordPageScrape(interaction.user, serverId, url);
        
        // Schedule files for deletion
        for (const file of result.outputFiles) {
          scheduleFileForDeletion(file, interaction.user, url);
        }
        
        // Log successful scraping
        await sendLogToWebhook('Scraping Success', interaction.user, `Successfully scraped URL: ${url}`, null, result.outputFiles[0]);
        
        // Send the files to the user
        await sendMultipleFiles(
          interaction, 
          result.outputFiles, 
          `Scraped content from ${url} (attached as file):`
        );
        
        // Create buttons for format options
        const row = new ActionRowBuilder()
          .addComponents(
            new ButtonBuilder()
              .setCustomId('viewMarkdown')
              .setLabel('View as Markdown')
              .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
              .setCustomId('viewPlainText')
              .setLabel('View as Plain Text')
              .setStyle(ButtonStyle.Secondary)
          );
        
        // Send a follow-up message with the buttons
        await interaction.followUp({
          content: 'Choose how you want to view the content:',
          components: [row],
          ephemeral: true
        });
      } else {
        await interaction.editReply({ 
          content: `Failed to scrape ${url}. Please check the URL and try again.`,
          ephemeral: true 
        });
        
        // Log scraping failure
        await sendLogToWebhook('Scraping Failure', interaction.user, `Failed to scrape URL: ${url}`, new Error(result.error || 'Conversion failed'));
      }
    } catch (error) {
      await interaction.editReply({ 
        content: `Error scraping ${url}: ${error.message}. Please check the URL and try again.`,
        ephemeral: true 
      });
      
      // Log scraping error
      await sendLogToWebhook('Scraping Error', interaction.user, `Error scraping URL: ${url}`, error);
    }
  } catch (replyError) {
    console.error('Error replying to interaction:', replyError);
    
    // Log the error
    await sendLogToWebhook('Interaction Error', interaction.user, `Error replying to interaction for URL: ${url}`, replyError);
  }
}

export default {
  handleScrapeCommand,
  handleScrapeModalSubmit
};
