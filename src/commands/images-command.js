import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from 'discord.js';
import { extractImages } from '../utils/converter.js';
import { scheduleFileForDeletion } from '../utils/file-manager.js';
import { sendLogToWebhook } from '../utils/logger.js';
import { sendImages } from '../utils/message-sender.js';
import { storeUserImageFiles } from '../utils/user-data.js';
import { recordPageScrape } from '../utils/leaderboard-service.js';
import fs from 'fs/promises';

/**
 * Handle the /images command
 * @param {Object} interaction - The Discord interaction
 * @returns {Promise<void>}
 */
export async function handleImagesCommand(interaction) {
  // Log command usage
  await sendLogToWebhook('Command', interaction.user, 'Used /images command');
  
  try {
    // Create the modal
    const modal = new ModalBuilder()
      .setCustomId('imagesModal')
      .setTitle('Extract Images from Webpage');
    
    // Add components to modal
    const urlInput = new TextInputBuilder()
      .setCustomId('urlInput')
      .setLabel('URL to extract images from')
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
    await sendLogToWebhook('Modal Error', interaction.user, 'Error showing images modal', modalError);
  }
}

/**
 * Handle the images modal submission
 * @param {Object} interaction - The Discord interaction
 * @returns {Promise<void>}
 */
export async function handleImagesModalSubmit(interaction) {
  // Get the data from the modal
  const url = interaction.fields.getTextInputValue('urlInput');
  
  // Log URL submission
  await sendLogToWebhook('URL Submission', interaction.user, `Submitted URL for image extraction: ${url}`);
  
  // Track if we've acknowledged the interaction
  let interactionAcknowledged = false;
  
  try {
    // Acknowledge the interaction
    await interaction.reply({ content: `Extracting images from ${url}... This may take a moment.`, ephemeral: true });
    interactionAcknowledged = true;
    
    // Create a unique output file name based on timestamp
    const timestamp = Date.now();
    const outputFile = `images_${timestamp}.json`;
    
    // Extract images from the URL
    try {
      const result = await extractImages(url, outputFile);
      
      if (result.success) {
        // Store the output files for this user
        storeUserImageFiles(interaction.user.id, url, result.outputFiles, timestamp, result.imageCount);
        
        // Get the server ID (or use 'global' for DMs)
        const serverId = interaction.guild ? interaction.guild.id : 'global';
        
        // Record the page scrape for the leaderboard
        await recordPageScrape(interaction.user, serverId, url);
        
        // Schedule files for deletion
        for (const file of result.outputFiles) {
          scheduleFileForDeletion(file, interaction.user, url);
        }
        
        // Log successful image extraction
        await sendLogToWebhook('Image Extraction Success', interaction.user, `Successfully extracted ${result.imageCount} images from URL: ${url}`);
        
        // Send the images to the user - wrap in try/catch to handle already acknowledged errors
        try {
          await sendImages(interaction, result.outputFiles, url);
        } catch (sendError) {
          console.error('Error sending images:', sendError);
          await sendLogToWebhook('Image Sending Error', interaction.user, `Error sending images from URL: ${url}`, sendError);
        }
        
        // Schedule image files for deletion
        const imageDir = 'images';
        try {
          const imageFiles = await fs.readdir(imageDir);
          for (const file of imageFiles) {
            const filePath = `${imageDir}/${file}`;
            scheduleFileForDeletion(filePath, interaction.user, url);
          }
        } catch (error) {
          console.error('Error scheduling image files for deletion:', error);
        }
      } else {
        try {
          await interaction.editReply({ 
            content: `Failed to extract images from ${url}. Please check the URL and try again.`,
            ephemeral: true 
          });
        } catch (editError) {
          console.error('Error editing reply:', editError);
          await sendLogToWebhook('Interaction Error', interaction.user, `Error editing reply for URL: ${url}`, editError);
        }
        
        // Log extraction failure
        await sendLogToWebhook('Image Extraction Failure', interaction.user, `Failed to extract images from URL: ${url}`, new Error(result.error || 'Extraction failed'));
      }
    } catch (error) {
      try {
        await interaction.editReply({ 
          content: `Error extracting images from ${url}: ${error.message}. Please check the URL and try again.`,
          ephemeral: true 
        });
      } catch (editError) {
        console.error('Error editing reply:', editError);
        await sendLogToWebhook('Interaction Error', interaction.user, `Error editing reply for URL: ${url}`, editError);
      }
      
      // Log extraction error
      await sendLogToWebhook('Image Extraction Error', interaction.user, `Error extracting images from URL: ${url}`, error);
    }
  } catch (replyError) {
    console.error('Error replying to interaction:', replyError);
    
    // Log the error
    await sendLogToWebhook('Interaction Error', interaction.user, `Error replying to interaction for URL: ${url}`, replyError);
    
    // If we haven't acknowledged the interaction yet, try to do so
    if (!interactionAcknowledged) {
      try {
        await interaction.reply({ 
          content: `Error processing your request for ${url}. Please try again later.`,
          ephemeral: true 
        });
      } catch (secondaryError) {
        console.error('Error sending secondary error message:', secondaryError);
        await sendLogToWebhook('Interaction Error', interaction.user, `Failed to acknowledge interaction for URL: ${url}`, secondaryError);
      }
    }
  }
}

export default {
  handleImagesCommand,
  handleImagesModalSubmit
};
