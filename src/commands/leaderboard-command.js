import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { getServerLeaderboard, getGlobalLeaderboard } from '../utils/leaderboard-service.js';
import { sendLogToWebhook } from '../utils/logger.js';

/**
 * Handle the /leaderboard command
 * @param {Object} interaction - The Discord interaction
 * @returns {Promise<void>}
 */
export async function handleLeaderboardCommand(interaction) {
  console.log('Leaderboard command received from user:', interaction.user.username);
  
  // Log command usage
  await sendLogToWebhook('Command', interaction.user, 'Used /leaderboard command');
  
  try {
    // Defer the reply to give us time to fetch the leaderboard
    console.log('Deferring reply for leaderboard command');
    await interaction.deferReply({ ephemeral: true });
    console.log('Reply deferred successfully');
    
    // Get the server ID (or use 'global' for DMs)
    const serverId = interaction.guild ? interaction.guild.id : 'global';
    console.log(`Fetching leaderboard for server: ${serverId}`);
    
    // Default to server leaderboard
    let leaderboardType = 'server';
    let leaderboardData = getServerLeaderboard(serverId, 10);
    
    // If in DMs or no server data, use global leaderboard
    if (!interaction.guild || leaderboardData.length === 0) {
      leaderboardType = 'global';
      leaderboardData = getGlobalLeaderboard(10);
    }
    
    console.log(`Leaderboard data fetched (${leaderboardType}):`, JSON.stringify(leaderboardData));
    
    if (leaderboardData.length === 0) {
      console.log('No leaderboard data found, sending empty message');
      await interaction.editReply({
        content: 'No one has scraped any pages yet. Be the first by using the `/scrape` command!',
        ephemeral: true
      });
      return;
    }
    
    // Create an embed for the leaderboard
    console.log('Creating leaderboard embed');
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(`📊 Webpage Scraper ${leaderboardType === 'global' ? 'Global' : 'Server'} Leaderboard`)
      .setDescription(`Top users by number of pages scraped${leaderboardType === 'global' ? ' across all servers' : ' in this server'}`)
      .setTimestamp();
    
    // Add fields for each user
    leaderboardData.forEach((userData, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      console.log(`Adding user to leaderboard: ${userData.username}`);
      embed.addFields({
        name: `${medal} ${userData.username}`,
        value: `Pages Scraped: **${userData.pagesScraped}**${userData.lastScrapedAt ? `\nLast Active: <t:${Math.floor(new Date(userData.lastScrapedAt).getTime() / 1000)}:R>` : ''}`,
        inline: true
      });
    });
    
    // Add a footer
    embed.setFooter({ 
      text: 'Use /scrape to extract content from webpages',
    });
    
    // Create buttons for switching between server and global leaderboards
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('serverLeaderboard')
          .setLabel('Server Leaderboard')
          .setStyle(leaderboardType === 'server' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(leaderboardType === 'server'),
        new ButtonBuilder()
          .setCustomId('globalLeaderboard')
          .setLabel('Global Leaderboard')
          .setStyle(leaderboardType === 'global' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(leaderboardType === 'global')
      );
    
    // Send the embed with buttons
    console.log('Sending leaderboard embed');
    await interaction.editReply({
      embeds: [embed],
      components: interaction.guild ? [row] : [], // Only show buttons in a guild
      ephemeral: true
    });
    console.log('Leaderboard embed sent successfully');
    
    // Log successful leaderboard display
    await sendLogToWebhook('Leaderboard', interaction.user, `Viewed ${leaderboardType} leaderboard`);
  } catch (error) {
    console.error('Error displaying leaderboard:', error);
    
    // Try to respond with an error message
    try {
      if (interaction.deferred) {
        console.log('Sending error message for deferred interaction');
        await interaction.editReply({
          content: `Error displaying leaderboard: ${error.message}. Please try again.`,
          ephemeral: true
        });
      } else {
        console.log('Sending error message for unacknowledged interaction');
        await interaction.reply({
          content: `Error displaying leaderboard: ${error.message}. Please try again.`,
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
    
    // Log the error
    await sendLogToWebhook('Leaderboard Error', interaction.user, 'Error displaying leaderboard', error);
  }
}

/**
 * Handle leaderboard button interactions
 * @param {Object} interaction - The button interaction
 * @returns {Promise<void>}
 */
export async function handleLeaderboardButtonInteraction(interaction) {
  console.log(`Leaderboard button clicked: ${interaction.customId}`);
  
  try {
    // Defer the update to give us time to fetch the leaderboard
    await interaction.deferUpdate();
    
    // Get the server ID (or use 'global' for DMs)
    const serverId = interaction.guild ? interaction.guild.id : 'global';
    
    // Determine which leaderboard to show
    let leaderboardType = 'server';
    let leaderboardData;
    
    if (interaction.customId === 'globalLeaderboard') {
      leaderboardType = 'global';
      leaderboardData = getGlobalLeaderboard(10);
    } else {
      leaderboardData = getServerLeaderboard(serverId, 10);
      
      // If no server data, use global leaderboard
      if (leaderboardData.length === 0) {
        leaderboardType = 'global';
        leaderboardData = getGlobalLeaderboard(10);
      }
    }
    
    console.log(`Leaderboard data fetched (${leaderboardType}):`, JSON.stringify(leaderboardData));
    
    if (leaderboardData.length === 0) {
      console.log('No leaderboard data found, sending empty message');
      await interaction.editReply({
        content: 'No one has scraped any pages yet. Be the first by using the `/scrape` command!',
        components: [],
        ephemeral: true
      });
      return;
    }
    
    // Create an embed for the leaderboard
    console.log('Creating leaderboard embed');
    const embed = new EmbedBuilder()
      .setColor(0x0099FF)
      .setTitle(`📊 Webpage Scraper ${leaderboardType === 'global' ? 'Global' : 'Server'} Leaderboard`)
      .setDescription(`Top users by number of pages scraped${leaderboardType === 'global' ? ' across all servers' : ' in this server'}`)
      .setTimestamp();
    
    // Add fields for each user
    leaderboardData.forEach((userData, index) => {
      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
      console.log(`Adding user to leaderboard: ${userData.username}`);
      embed.addFields({
        name: `${medal} ${userData.username}`,
        value: `Pages Scraped: **${userData.pagesScraped}**${userData.lastScrapedAt ? `\nLast Active: <t:${Math.floor(new Date(userData.lastScrapedAt).getTime() / 1000)}:R>` : ''}`,
        inline: true
      });
    });
    
    // Add a footer
    embed.setFooter({ 
      text: 'Use /scrape to extract content from webpages',
    });
    
    // Create buttons for switching between server and global leaderboards
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('serverLeaderboard')
          .setLabel('Server Leaderboard')
          .setStyle(leaderboardType === 'server' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(leaderboardType === 'server'),
        new ButtonBuilder()
          .setCustomId('globalLeaderboard')
          .setLabel('Global Leaderboard')
          .setStyle(leaderboardType === 'global' ? ButtonStyle.Primary : ButtonStyle.Secondary)
          .setDisabled(leaderboardType === 'global')
      );
    
    // Update the message with the new embed and buttons
    console.log('Updating leaderboard embed');
    await interaction.editReply({
      embeds: [embed],
      components: [row],
      ephemeral: true
    });
    console.log('Leaderboard embed updated successfully');
    
    // Log successful leaderboard display
    await sendLogToWebhook('Leaderboard', interaction.user, `Viewed ${leaderboardType} leaderboard`);
  } catch (error) {
    console.error('Error updating leaderboard:', error);
    
    // Try to respond with an error message
    try {
      await interaction.editReply({
        content: `Error updating leaderboard: ${error.message}. Please try again.`,
        ephemeral: true
      });
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
    
    // Log the error
    await sendLogToWebhook('Leaderboard Error', interaction.user, 'Error updating leaderboard', error);
  }
}

export default {
  handleLeaderboardCommand,
  handleLeaderboardButtonInteraction
};
