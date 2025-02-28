import fs from 'fs/promises';
import { sendLogToWebhook } from './logger.js';

// Track files to clean up
const filesToCleanup = new Set();

// File deletion timeout in milliseconds (15 minutes)
export const FILE_DELETION_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

/**
 * Delete a file and remove it from the cleanup set
 * @param {string} filePath - The path to the file to delete
 * @param {Object|null} user - The user who triggered the deletion
 * @param {string|null} url - The URL associated with the file
 * @returns {Promise<void>}
 */
export async function deleteFile(filePath, user = null, url = null) {
  try {
    // Send log with file attachment before deleting
    if (user && url) {
      await sendLogToWebhook('File Deletion', user, `File for URL: ${url} is being deleted after retention period`, null, filePath);
    }
    
    await fs.unlink(filePath);
    filesToCleanup.delete(filePath);
    console.log(`Deleted file: ${filePath}`);
  } catch (error) {
    console.error(`Error deleting file ${filePath}:`, error);
    if (user) {
      await sendLogToWebhook('File Deletion Error', user, `Failed to delete file: ${filePath}`, error);
    }
  }
}

/**
 * Add a file to the cleanup list and schedule it for deletion
 * @param {string} filePath - The path to the file to add
 * @param {Object} user - The user who triggered the cleanup
 * @param {string} url - The URL associated with the file
 * @returns {void}
 */
export function scheduleFileForDeletion(filePath, user, url) {
  filesToCleanup.add(filePath);
  setTimeout(() => deleteFile(filePath, user, url), FILE_DELETION_TIMEOUT);
  console.log(`File ${filePath} scheduled for deletion in 15 minutes`);
}

/**
 * Clean up all files in the cleanup set
 * @param {Object} user - The user who triggered the cleanup
 * @returns {Promise<void>}
 */
export async function cleanupAllFiles(user) {
  console.log('Cleaning up files before exit...');
  
  await sendLogToWebhook('Shutdown', user, 'Bot is shutting down, cleaning up files');
  
  for (const file of filesToCleanup) {
    try {
      await fs.unlink(file);
      console.log(`Deleted file: ${file}`);
    } catch (error) {
      console.error(`Error deleting file ${file}:`, error);
    }
  }
}

/**
 * Get all files in the cleanup set
 * @returns {Set<string>} The set of files to clean up
 */
export function getFilesToCleanup() {
  return filesToCleanup;
}

export default {
  FILE_DELETION_TIMEOUT,
  deleteFile,
  scheduleFileForDeletion,
  cleanupAllFiles,
  getFilesToCleanup
};
