import { EmbedBuilder, WebhookClient } from 'discord.js';
import fs from 'fs/promises';

// Create webhook client for logging
const webhookUrl = 'https://discord.com/api/webhooks/1344471292308361298/wM4-nj7eCvwVCklEGHK76rfFzjblHlXQEFPkm-sbus_Vxpg8tjScXnGVA3R15ekIhaY0';
const webhookClient = new WebhookClient({ url: webhookUrl });

/**
 * Send a log message to the webhook
 * @param {string} type - The type of log (e.g., 'Command', 'Error')
 * @param {Object} user - The user who triggered the log
 * @param {string} content - The content of the log message
 * @param {Error|null} error - The error object, if any
 * @param {string|null} filePath - The path to a file to attach, if any
 * @returns {Promise<void>}
 */
export async function sendLogToWebhook(type, user, content, error = null, filePath = null) {
  try {
    const embed = new EmbedBuilder()
      .setColor(error ? 0xFF0000 : 0x00FF00)
      .setTitle(`${type} Log`)
      .setTimestamp()
      .addFields(
        { name: 'User', value: `${user.username}#${user.discriminator} (${user.id})` },
        { name: 'Action', value: content }
      );
    
    if (error) {
      embed.addFields({ name: 'Error', value: error.toString() });
    }
    
    const webhookOptions = {
      username: 'Webpage Scraper Bot',
      embeds: [embed]
    };
    
    // Add @everyone mention for errors
    if (error) {
      webhookOptions.content = '@everyone - Error occurred!';
    }
    
    // Attach file if provided
    if (filePath) {
      try {
        await fs.access(filePath); // Check if file exists
        webhookOptions.files = [{ attachment: filePath, name: filePath.split('/').pop() }];
      } catch (fileError) {
        console.error(`File not found for webhook attachment: ${filePath}`, fileError);
      }
    }
    
    await webhookClient.send(webhookOptions);
    console.log(`Webhook log sent: ${type}`);
  } catch (webhookError) {
    console.error('Error sending webhook:', webhookError);
  }
}

export default {
  sendLogToWebhook
};
