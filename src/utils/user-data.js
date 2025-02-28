// Maps to track user data
const userScrapedFiles = new Map(); // Map to track files scraped by each user
const userImageFiles = new Map(); // Map to track image files by each user

/**
 * Store scraped files for a user
 * @param {string} userId - The user's ID
 * @param {string} url - The URL that was scraped
 * @param {string[]} files - Array of file paths
 * @param {number} timestamp - The timestamp when the files were created
 * @returns {void}
 */
export function storeUserScrapedFiles(userId, url, files, timestamp) {
  userScrapedFiles.set(userId, {
    url,
    files,
    timestamp
  });
}

/**
 * Get scraped files for a user
 * @param {string} userId - The user's ID
 * @returns {Object|undefined} The user's scraped files data
 */
export function getUserScrapedFiles(userId) {
  return userScrapedFiles.get(userId);
}

/**
 * Store image files for a user
 * @param {string} userId - The user's ID
 * @param {string} url - The URL that was scraped
 * @param {string[]} files - Array of file paths
 * @param {number} timestamp - The timestamp when the files were created
 * @param {number} imageCount - The number of images extracted
 * @returns {void}
 */
export function storeUserImageFiles(userId, url, files, timestamp, imageCount) {
  userImageFiles.set(userId, {
    url,
    files,
    timestamp,
    imageCount
  });
}

/**
 * Get image files for a user
 * @param {string} userId - The user's ID
 * @returns {Object|undefined} The user's image files data
 */
export function getUserImageFiles(userId) {
  return userImageFiles.get(userId);
}

export default {
  storeUserScrapedFiles,
  getUserScrapedFiles,
  storeUserImageFiles,
  getUserImageFiles
};
