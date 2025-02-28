import {
  initLeaderboardStorage,
  saveLeaderboardData,
  getUserData,
  setUserData,
  getAllUsers
} from './leaderboard-storage.js';

/**
 * Initialize the leaderboard
 * @returns {Promise<void>}
 */
export async function initLeaderboard() {
  await initLeaderboardStorage();
}

/**
 * Record a page scrape for a user
 * @param {Object} user - The Discord user who scraped a page
 * @param {string} serverId - The Discord server ID
 * @param {string} url - The URL that was scraped
 * @returns {Promise<void>}
 */
export async function recordPageScrape(user, serverId, url) {
  console.log(`Recording page scrape for user ${user.username} (${user.id}) in server ${serverId}`);
  
  const userId = user.id;
  
  // Get existing user data or create new
  let userData = getUserData(serverId, userId);
  
  if (!userData) {
    console.log(`Creating new user data for ${user.username} in server ${serverId}`);
    userData = {
      username: user.username,
      avatarURL: user.displayAvatarURL({ format: 'png', dynamic: true }),
      pagesScraped: 0,
      lastScrapedUrl: '',
      lastScrapedAt: null
    };
  }
  
  // Update user data
  userData.pagesScraped += 1;
  userData.lastScrapedUrl = url;
  userData.lastScrapedAt = new Date().toISOString();
  
  // Make sure username and avatar are up to date
  userData.username = user.username;
  userData.avatarURL = user.displayAvatarURL({ format: 'png', dynamic: true });
  
  // Save the updated user data
  setUserData(serverId, userId, userData);
  
  // Save the leaderboard data to disk
  await saveLeaderboardData();
  console.log(`Leaderboard updated for user ${user.username} in server ${serverId}`);
}

/**
 * Get the leaderboard data for a specific server
 * @param {string} serverId - The Discord server ID
 * @param {number} limit - Maximum number of users to return (0 for all)
 * @returns {Array} The leaderboard data sorted by pages scraped
 */
export function getServerLeaderboard(serverId, limit = 0) {
  console.log(`Getting leaderboard for server ${serverId}, limit: ${limit}`);
  
  // Get all users for the server
  const users = getAllUsers(serverId);
  
  // Convert the object to an array and sort by pages scraped
  const leaderboard = Object.values(users)
    .sort((a, b) => b.pagesScraped - a.pagesScraped);
  
  // Return all or limited results
  return limit > 0 ? leaderboard.slice(0, limit) : leaderboard;
}

/**
 * Get a user's stats for a specific server
 * @param {string} serverId - The Discord server ID
 * @param {string} userId - The Discord user ID
 * @returns {Object|null} The user's stats or null if not found
 */
export function getUserStats(serverId, userId) {
  return getUserData(serverId, userId);
}

/**
 * Get global leaderboard across all servers
 * @param {number} limit - Maximum number of users to return (0 for all)
 * @returns {Array} The global leaderboard data sorted by pages scraped
 */
export function getGlobalLeaderboard(limit = 0) {
  console.log(`Getting global leaderboard, limit: ${limit}`);
  
  // Create a map to store the combined user data
  const combinedUsers = new Map();
  
  // Get all server data
  const servers = getAllUsers('global');
  
  // Combine user data from all servers
  Object.values(servers).forEach(userData => {
    const userId = userData.userId;
    
    if (combinedUsers.has(userId)) {
      // Update existing user data
      const existingData = combinedUsers.get(userId);
      existingData.pagesScraped += userData.pagesScraped;
      
      // Update last scraped time if newer
      if (userData.lastScrapedAt && (!existingData.lastScrapedAt || new Date(userData.lastScrapedAt) > new Date(existingData.lastScrapedAt))) {
        existingData.lastScrapedAt = userData.lastScrapedAt;
        existingData.lastScrapedUrl = userData.lastScrapedUrl;
      }
    } else {
      // Add new user data
      combinedUsers.set(userId, { ...userData });
    }
  });
  
  // Convert the map to an array and sort by pages scraped
  const leaderboard = Array.from(combinedUsers.values())
    .sort((a, b) => b.pagesScraped - a.pagesScraped);
  
  // Return all or limited results
  return limit > 0 ? leaderboard.slice(0, limit) : leaderboard;
}

export default {
  initLeaderboard,
  recordPageScrape,
  getServerLeaderboard,
  getGlobalLeaderboard,
  getUserStats
};
