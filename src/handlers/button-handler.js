import fs from 'fs/promises';
import { sendLogToWebhook } from '../utils/logger.js';
import { sendMultipleFiles } from '../utils/message-sender.js';
import { getUserScrapedFiles } from '../utils/user-data.js';
import { scheduleFileForDeletion } from '../utils/file-manager.js';
import { handleLeaderboardButtonInteraction } from '../commands/leaderboard-command.js';

/**
 * Handle button interactions
 * @param {Object} interaction - The Discord interaction
 * @returns {Promise<void>}
 */
export async function handleButtonInteraction(interaction) {
  // Log button click
  await sendLogToWebhook('Button Click', interaction.user, `Clicked ${interaction.customId} button`);
  
  try {
    // Handle leaderboard buttons
    if (interaction.customId === 'serverLeaderboard' || interaction.customId === 'globalLeaderboard') {
      await handleLeaderboardButtonInteraction(interaction);
      return;
    }
    
    // Handle format buttons
    if (interaction.customId === 'viewMarkdown' || interaction.customId === 'viewPlainText') {
      await handleFormatButtonInteraction(interaction);
      return;
    }
    
    // Unknown button
    console.log(`Unknown button interaction: ${interaction.customId}`);
    await interaction.reply({
      content: 'This button is not recognized or is no longer valid.',
      ephemeral: true
    });
  } catch (buttonError) {
    console.error('Error handling button interaction:', buttonError);
    
    // Try to respond with an error message
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `Error processing button: ${buttonError.message}. Please try again.`,
          ephemeral: true
        });
      } else if (interaction.deferred) {
        await interaction.editReply({
          content: `Error processing button: ${buttonError.message}. Please try again.`,
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
    
    // Log the error
    await sendLogToWebhook('Button Error', interaction.user, `Error handling button: ${interaction.customId}`, buttonError);
  }
}

/**
 * Handle format button interactions (Markdown/Plain Text)
 * @param {Object} interaction - The Discord interaction
 * @returns {Promise<void>}
 */
async function handleFormatButtonInteraction(interaction) {
  // Get the user's scraped files
  const userData = getUserScrapedFiles(interaction.user.id);
  
  if (!userData || !userData.files || userData.files.length === 0) {
    await interaction.reply({ 
      content: 'No scraped content found. Please use the /scrape command first.',
      ephemeral: true 
    });
    
    // Log no files found
    await sendLogToWebhook('Button Error', interaction.user, 'No scraped content found for button interaction');
    return;
  }
  
  // Process each file
  const outputFiles = [];
  
  if (interaction.customId === 'viewMarkdown') {
    // For markdown, we can just use the existing files
    await interaction.deferReply({ ephemeral: true });
    await sendMultipleFiles(
      interaction,
      userData.files,
      'Here is the content in Markdown format:'
    );
    
    // Log markdown view
    await sendLogToWebhook('Format View', interaction.user, 'Viewed content as Markdown', null, userData.files[0]);
  } else if (interaction.customId === 'viewPlainText') {
    // For plain text, we need to convert each file
    await interaction.deferReply({ ephemeral: true });
    
    for (let i = 0; i < userData.files.length; i++) {
      const content = await fs.readFile(userData.files[i], 'utf-8');
      
      // Convert markdown to plain text (simple conversion by removing markdown syntax)
      const plainText = content
        .replace(/#{1,6}\s/g, '') // Remove headers
        .replace(/\*\*/g, '')     // Remove bold
        .replace(/\*/g, '')       // Remove italic
        .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with just the text
        .replace(/`{1,3}/g, '');  // Remove code blocks
      
      // Create a new text file
      const outputFile = `plaintext_${userData.timestamp}_part${i+1}.txt`;
      await fs.writeFile(outputFile, plainText);
      scheduleFileForDeletion(outputFile, interaction.user, 'Format conversion - Plain Text');
      outputFiles.push(outputFile);
    }
    
    // Send the plain text files
    await sendMultipleFiles(
      interaction,
      outputFiles,
      'Here is the content in Plain Text format:'
    );
    
    // Log plain text view
    await sendLogToWebhook('Format View', interaction.user, 'Viewed content as Plain Text', null, outputFiles[0]);
  }
}

export default {
  handleButtonInteraction
};
