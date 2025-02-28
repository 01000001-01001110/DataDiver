import fs from 'fs/promises';
import path from 'path';

// Path to the leaderboard data file
const LEADERBOARD_FILE = 'leaderboard.json';

// In-memory cache of the leaderboard data
let leaderboardData = null;

/**
 * Initialize the leaderboard storage
 * @returns {Promise<void>}
 */
export async function initLeaderboardStorage() {
  try {
    // Check if the leaderboard file exists
    try {
      await fs.access(LEADERBOARD_FILE);
      // If it exists, load it
      const data = await fs.readFile(LEADERBOARD_FILE, 'utf-8');
      leaderboardData = JSON.parse(data);
      console.log('Leaderboard data loaded');
    } catch (error) {
      // If it doesn't exist, create a new one
      leaderboardData = {
        servers: {}
      };
      await saveLeaderboardData();
      console.log('New leaderboard created');
    }
    
    // Migrate old format if needed
    if (!leaderboardData.servers) {
      console.log('Migrating old leaderboard format to new server-based format');
      const oldData = { ...leaderboardData };
      leaderboardData = {
        servers: {
          global: { users: oldData }
        }
      };
      await saveLeaderboardData();
      console.log('Leaderboard data migrated successfully');
    }
  } catch (error) {
    console.error('Error initializing leaderboard storage:', error);
    // Initialize with empty data if there's an error
    leaderboardData = {
      servers: {}
    };
  }
}

/**
 * Save the leaderboard data to disk
 * @returns {Promise<void>}
 */
export async function saveLeaderboardData() {
  try {
    await fs.writeFile(LEADERBOARD_FILE, JSON.stringify(leaderboardData, null, 2));
    console.log('Leaderboard data saved successfully');
  } catch (error) {
    console.error('Error saving leaderboard:', error);
  }
}

/**
 * Get server data from the leaderboard
 * @param {string} serverId - The Discord server ID
 * @returns {Object} The server data
 */
export function getServerData(serverId) {
  if (!leaderboardData) {
    throw new Error('Leaderboard data not initialized');
  }
  
  // Initialize server data if it doesn't exist
  if (!leaderboardData.servers[serverId]) {
    leaderboardData.servers[serverId] = {
      users: {}
    };
  }
  
  return leaderboardData.servers[serverId];
}

/**
 * Get all server data from the leaderboard
 * @returns {Object} All server data
 */
export function getAllServerData() {
  if (!leaderboardData) {
    throw new Error('Leaderboard data not initialized');
  }
  
  return leaderboardData.servers;
}

/**
 * Get user data from a specific server
 * @param {string} serverId - The Discord server ID
 * @param {string} userId - The Discord user ID
 * @returns {Object|null} The user data or null if not found
 */
export function getUserData(serverId, userId) {
  const serverData = getServerData(serverId);
  return serverData.users[userId] || null;
}

/**
 * Set user data for a specific server
 * @param {string} serverId - The Discord server ID
 * @param {string} userId - The Discord user ID
 * @param {Object} userData - The user data to set
 * @returns {void}
 */
export function setUserData(serverId, userId, userData) {
  const serverData = getServerData(serverId);
  serverData.users[userId] = userData;
}

/**
 * Get all users from a specific server
 * @param {string} serverId - The Discord server ID
 * @returns {Object} All users in the server
 */
export function getAllUsers(serverId) {
  const serverData = getServerData(serverId);
  return serverData.users;
}

export default {
  initLeaderboardStorage,
  saveLeaderboardData,
  getServerData,
  getAllServerData,
  getUserData,
  setUserData,
  getAllUsers
};
