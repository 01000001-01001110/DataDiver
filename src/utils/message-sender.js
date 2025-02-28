import { AttachmentBuilder } from 'discord.js';
import fs from 'fs/promises';
import { sendLogToWebhook } from './logger.js';

/**
 * Send multiple files to Discord
 * @param {Object} interaction - The Discord interaction
 * @param {string[]} files - Array of file paths to send
 * @param {string} contentMessage - The message to send with the files
 * @param {boolean} isReply - Whether to use reply or editReply
 * @returns {Promise<void>}
 */
export async function sendMultipleFiles(interaction, files, contentMessage, isReply = false) {
  try {
    // If there's only one file, send it directly
    if (files.length === 1) {
      if (isReply) {
        await interaction.reply({
          content: contentMessage,
          files: [{ attachment: files[0], name: files[0].split('/').pop() }],
          ephemeral: true
        });
      } else {
        await interaction.editReply({
          content: contentMessage,
          files: [{ attachment: files[0], name: files[0].split('/').pop() }],
          ephemeral: true
        });
      }
      return;
    }
    
    // For multiple files, send the first one with the edit reply
    if (isReply) {
      await interaction.reply({
        content: `${contentMessage} (Part 1 of ${files.length})`,
        files: [{ attachment: files[0], name: files[0].split('/').pop() }],
        ephemeral: true
      });
    } else {
      await interaction.editReply({
        content: `${contentMessage} (Part 1 of ${files.length})`,
        files: [{ attachment: files[0], name: files[0].split('/').pop() }],
        ephemeral: true
      });
    }
    
    // Send the rest as follow-up messages
    for (let i = 1; i < files.length; i++) {
      await interaction.followUp({
        content: `Part ${i+1} of ${files.length}:`,
        files: [{ attachment: files[i], name: files[i].split('/').pop() }],
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error sending multiple files:', error);
    
    // Try to notify the user about the error
    try {
      if (isReply && !interaction.replied) {
        await interaction.reply({
          content: `Error sending files: ${error.message}`,
          ephemeral: true
        });
      } else if (!isReply && interaction.deferred) {
        await interaction.editReply({
          content: `Error sending files: ${error.message}`,
          ephemeral: true
        });
      } else if (!interaction.replied) {
        await interaction.reply({
          content: `Error sending files: ${error.message}`,
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
}

/**
 * Send images to Discord
 * @param {Object} interaction - The Discord interaction
 * @param {string[]} imageBatchFiles - Array of JSON files containing image batches
 * @param {string} url - The URL the images were extracted from
 * @returns {Promise<void>}
 */
export async function sendImages(interaction, imageBatchFiles, url) {
  try {
    // Load image batches from JSON files
    const imageBatches = [];
    for (const batchFile of imageBatchFiles) {
      const batchContent = await fs.readFile(batchFile, 'utf-8');
      const batch = JSON.parse(batchContent);
      imageBatches.push(batch);
    }
    
    // Count total images
    const totalImages = imageBatches.reduce((total, batch) => total + batch.length, 0);
    
    if (totalImages === 0) {
      try {
        await interaction.editReply({
          content: `No images found on ${url}`,
          ephemeral: true
        });
      } catch (editError) {
        console.error('Error editing reply for no images:', editError);
        // Don't try to send another message if this fails
      }
      return;
    }
    
    // Send initial message
    try {
      await interaction.editReply({
        content: `Found ${totalImages} images on ${url}. Sending them now...`,
        ephemeral: true
      });
    } catch (editError) {
      console.error('Error editing reply for image count:', editError);
      // Continue anyway since we want to try sending the images
    }
    
    // Send each batch of images
    for (let batchIndex = 0; batchIndex < imageBatches.length; batchIndex++) {
      const batch = imageBatches[batchIndex];
      
      // Prepare files for this batch
      const files = [];
      const descriptions = [];
      
      for (let i = 0; i < batch.length; i++) {
        const image = batch[i];
        
        // Check if the image file exists and has content
        try {
          const stats = await fs.stat(image.path);
          if (stats.size === 0) {
            console.error(`Image file is empty: ${image.path}`);
            continue; // Skip this image
          }
          
          files.push(new AttachmentBuilder(image.path));
          descriptions.push(`${i+1}. ${image.description}`);
        } catch (fileError) {
          console.error(`Error checking image file: ${image.path}`, fileError);
          continue; // Skip this image
        }
      }
      
      // Skip empty batches
      if (files.length === 0) {
        console.log(`Skipping empty batch ${batchIndex + 1}`);
        continue;
      }
      
      // Send this batch
      const batchNumber = batchIndex + 1;
      const batchMessage = `Image batch ${batchNumber} of ${imageBatches.length} (${files.length} images)`;
      
      try {
        await interaction.followUp({
          content: batchMessage + (descriptions.length > 0 ? `\n\n${descriptions.join('\n')}` : ''),
          files: files,
          ephemeral: true
        });
      } catch (batchError) {
        console.error(`Error sending batch ${batchNumber}:`, batchError);
        
        // Log the error but continue with other batches
        await sendLogToWebhook('Image Batch Error', interaction.user, `Error sending image batch ${batchNumber} for URL: ${url}`, batchError);
        
        // Try to send a message about the error, but don't worry if it fails
        try {
          await interaction.followUp({
            content: `Error sending image batch ${batchNumber}: ${batchError.message}`,
            ephemeral: true
          });
        } catch (followupError) {
          console.error('Error sending batch error message:', followupError);
        }
      }
      
      // Add a small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Final message
    try {
      await interaction.followUp({
        content: `All ${totalImages} images have been sent. Images will be deleted from the server after 15 minutes.`,
        ephemeral: true
      });
    } catch (finalError) {
      console.error('Error sending final message:', finalError);
      // Don't worry if this fails
    }
  } catch (error) {
    console.error('Error sending images:', error);
    await sendLogToWebhook('Image Sending Error', interaction.user, `Error sending images from URL: ${url}`, error);
    
    // Try to send an error message, but don't worry if it fails
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `Error sending images: ${error.message}`,
          ephemeral: true
        });
      } else {
        await interaction.followUp({
          content: `Error sending images: ${error.message}`,
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
}

export default {
  sendMultipleFiles,
  sendImages
};
