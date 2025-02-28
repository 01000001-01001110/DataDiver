import fs from 'fs/promises';
import path from 'path';

// Path to the leaderboard data file
const LEADERBOARD_FILE = 'leaderboard.json';

// In-memory cache of the leaderboard data
let leaderboardData = null;

/**
 * Initialize the leaderboard
 * @returns {Promise<void>}
 */
export async function initLeaderboard() {
  try {
    // Check if the leaderboard file exists
    try {
      await fs.access(LEADERBOARD_FILE);
      // If it exists, load it
      const data = await fs.readFile(LEADERBOARD_FILE, 'utf-8');
      leaderboardData = JSON.parse(data);
      console.log('Leaderboard data loaded:', JSON.stringify(leaderboardData));
    } catch (error) {
      // If it doesn't exist, create a new one
      leaderboardData = {};
      await saveLeaderboard();
      console.log('New leaderboard created');
    }
  } catch (error) {
    console.error('Error initializing leaderboard:', error);
    // Initialize with empty data if there's an error
    leaderboardData = {};
  }
}

/**
 * Save the leaderboard data to disk
 * @returns {Promise<void>}
 */
async function saveLeaderboard() {
  try {
    console.log('Saving leaderboard data:', JSON.stringify(leaderboardData));
    await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(leaderboardData, null, 2));
    console.log('Leaderboard data saved successfully');
  } catch (error) {
    console.error('Error saving leaderboard:', error);
  }
}

/**
 * Record a page scrape for a user
 * @param {Object} user - The Discord user who scraped a page
 * @param {string} url - The URL that was scraped
 * @returns {Promise<void>}
 */
export async function recordPageScrape(user, url) {
  console.log('Recording page scrape for user:', user.id, user.username);
  
  if (!leaderboardData) {
    console.log('Leaderboard data not initialized, initializing now');
    await initLeaderboard();
  }

  const userId = user.id;
  console.log('User ID:', userId);
  
  // Initialize user data if it doesn't exist
  if (!leaderboardData[userId]) {
    console.log('Creating new user data for:', userId);
    leaderboardData[userId] = {
      username: user.username,
      avatarURL: user.displayAvatarURL({ format: 'png', dynamic: true }),
      pagesScraped: 0,
      lastScrapedUrl: '',
      lastScrapedAt: null
    };
  }
  
  // Update user data
  leaderboardData[userId].pagesScraped += 1;
  leaderboardData[userId].lastScrapedUrl = url;
  leaderboardData[userId].lastScrapedAt = new Date().toISOString();
  
  // Make sure username and avatar are up to date
  leaderboardData[userId].username = user.username;
  leaderboardData[userId].avatarURL = user.displayAvatarURL({ format: 'png', dynamic: true });
  
  console.log('Updated user data:', JSON.stringify(leaderboardData[userId]));
  
  // Save the updated leaderboard
  await saveLeaderboard();
  console.log('Leaderboard saved after recording page scrape');
}

/**
 * Get the leaderboard data
 * @param {number} limit - Maximum number of users to return (0 for all)
 * @returns {Promise<Array>} The leaderboard data sorted by pages scraped
 */
export async function getLeaderboard(limit = 0) {
  console.log('Getting leaderboard data, limit:', limit);
  
  if (!leaderboardData) {
    console.log('Leaderboard data not initialized, initializing now');
    await initLeaderboard();
  }
  
  console.log('Current leaderboard data:', JSON.stringify(leaderboardData));
  
  // Convert the object to an array and sort by pages scraped
  const leaderboard = Object.values(leaderboardData)
    .sort((a, b) => b.pagesScraped - a.pagesScraped);
  
  console.log('Sorted leaderboard:', JSON.stringify(leaderboard));
  
  // Return all or limited results
  const result = limit > 0 ? leaderboard.slice(0, limit) : leaderboard;
  console.log('Returning leaderboard result:', JSON.stringify(result));
  return result;
}

/**
 * Get a user's stats
 * @param {string} userId - The Discord user ID
 * @returns {Promise<Object|null>} The user's stats or null if not found
 */
export async function getUserStats(userId) {
  console.log('Getting user stats for:', userId);
  
  if (!leaderboardData) {
    console.log('Leaderboard data not initialized, initializing now');
    await initLeaderboard();
  }
  
  const stats = leaderboardData[userId] || null;
  console.log('User stats:', JSON.stringify(stats));
  return stats;
}

export default {
  initLeaderboard,
  recordPageScrape,
  getLeaderboard,
  getUserStats
};
