import { EmbedBuilder } from 'discord.js';
import { sendLogToWebhook } from '../utils/logger.js';

/**
 * Handle the /help command
 * @param {Object} interaction - The Discord interaction
 * @returns {Promise<void>}
 */
export async function handleHelpCommand(interaction) {
  // Log command usage
  await sendLogToWebhook('Command', interaction.user, 'Used /help command');
  
  try {
    // Create the main help embed
    const helpEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('📚 Webpage Scraper Bot Help')
      .setDescription('This bot allows you to extract content from webpages and convert it to readable formats.')
      .setThumbnail(interaction.client.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { 
          name: '🔍 About', 
          value: 'Webpage Scraper Bot extracts content from websites and converts it to Markdown or plain text format. It can also extract images from webpages.'
        },
        { 
          name: '📋 Commands', 
          value: '`/scrape` - Extract text content from a webpage\n`/images` - Extract images from a webpage\n`/leaderboard` - View top users\n`/help` - Show this help message'
        }
      )
      .setTimestamp()
      .setFooter({ 
        text: 'Webpage Scraper Bot',
        iconURL: interaction.client.user.displayAvatarURL({ dynamic: true })
      });

    // Create the scrape command embed
    const scrapeEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('📝 /scrape Command')
      .setDescription('Extract text content from a webpage and convert it to readable formats.')
      .addFields(
        { 
          name: '📋 Usage', 
          value: '1. Type `/scrape`\n2. Enter the URL of the webpage you want to scrape\n3. Submit the form\n4. The bot will extract the content and send it as a file\n5. Use the buttons to view the content in different formats'
        },
        { 
          name: '✨ Features', 
          value: '• Converts HTML to Markdown format\n• Handles JavaScript-rendered websites\n• Preserves formatting (headers, lists, tables, etc.)\n• Removes ads, scripts, and other unwanted elements\n• Provides plain text option for simpler viewing'
        },
        { 
          name: '⚠️ Limitations', 
          value: 'Some websites may block scraping or have anti-bot measures. The bot may not be able to extract content from these sites.'
        }
      );

    // Create the images command embed
    const imagesEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('🖼️ /images Command')
      .setDescription('Extract images from a webpage.')
      .addFields(
        { 
          name: '📋 Usage', 
          value: '1. Type `/images`\n2. Enter the URL of the webpage you want to extract images from\n3. Submit the form\n4. The bot will extract the images and send them to you'
        },
        { 
          name: '✨ Features', 
          value: '• Extracts all images from a webpage\n• Preserves image descriptions from alt text\n• Handles various image formats (JPEG, PNG, GIF, etc.)\n• Organizes images into batches for easier viewing'
        },
        { 
          name: '⚠️ Limitations', 
          value: 'Some websites may block image extraction or use complex methods to display images. The bot may not be able to extract images from these sites.'
        }
      );

    // Create the leaderboard command embed
    const leaderboardEmbed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle('📊 /leaderboard Command')
      .setDescription('View the top users by number of pages scraped.')
      .addFields(
        { 
          name: '📋 Usage', 
          value: 'Type `/leaderboard` to see the top users who have used the bot to scrape webpages.'
        },
        { 
          name: '✨ Features', 
          value: '• Shows top users ranked by number of pages scraped\n• Displays user avatars and usernames\n• Shows when each user was last active\n• Updates in real-time as users scrape more pages'
        }
      );

    // Send the embeds
    await interaction.reply({
      embeds: [helpEmbed],
      ephemeral: true
    });

    // Send the command-specific embeds as follow-ups
    await interaction.followUp({
      embeds: [scrapeEmbed],
      ephemeral: true
    });

    await interaction.followUp({
      embeds: [imagesEmbed],
      ephemeral: true
    });

    await interaction.followUp({
      embeds: [leaderboardEmbed],
      ephemeral: true
    });

    // Log successful help display
    await sendLogToWebhook('Help', interaction.user, 'Viewed help');
  } catch (error) {
    console.error('Error displaying help:', error);
    
    // Try to respond with an error message
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `Error displaying help: ${error.message}. Please try again.`,
          ephemeral: true
        });
      } else if (interaction.deferred) {
        await interaction.editReply({
          content: `Error displaying help: ${error.message}. Please try again.`,
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
    
    // Log the error
    await sendLogToWebhook('Help Error', interaction.user, 'Error displaying help', error);
  }
}

export default {
  handleHelpCommand
};
