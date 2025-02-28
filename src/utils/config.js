import fs from 'fs/promises';

/**
 * Load configuration from config.json
 * @returns {Promise<Object>} The configuration object
 */
export async function loadConfig() {
  try {
    const configFile = await fs.readFile('./config.json', 'utf-8');
    return JSON.parse(configFile);
  } catch (error) {
    console.error('Error loading configuration:', error);
    process.exit(1);
  }
}

export default await loadConfig();
