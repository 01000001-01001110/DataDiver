import { exec } from 'child_process';
import fs from 'fs/promises';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Convert a URL or file to Markdown
 * @param {string} source - The URL or file path to convert
 * @param {string} outputPath - The path to save the output to
 * @returns {Promise<Object>} The result of the conversion
 */
export async function convertToMarkdown(source, outputPath) {
    try {
        // Execute Python script
        const { stdout, stderr } = await execAsync(`python convert.py "${source}" "${outputPath}"`);
        
        // Parse the JSON response from Python
        const result = JSON.parse(stdout);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        // Handle multiple output files
        const outputFiles = Array.isArray(result.output) ? result.output : [result.output];
        
        console.log(`Successfully converted to ${outputFiles.join(', ')}`);
        return {
            success: true,
            outputFiles: outputFiles
        };
    } catch (error) {
        console.error('Error during conversion:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Extract images from a URL or file
 * @param {string} source - The URL or file path to extract images from
 * @param {string} outputPath - The path to save the output to
 * @returns {Promise<Object>} The result of the extraction
 */
export async function extractImages(source, outputPath) {
    try {
        // Create images directory if it doesn't exist
        await fs.mkdir('images', { recursive: true });
        
        // Execute Python script with --images flag
        const { stdout, stderr } = await execAsync(`python convert.py "${source}" "${outputPath}" --images`);
        
        // Parse the JSON response from Python
        const result = JSON.parse(stdout);
        
        if (!result.success) {
            throw new Error(result.error);
        }
        
        // Handle multiple output files (image batches)
        const outputFiles = Array.isArray(result.output) ? result.output : [result.output];
        const imageCount = result.image_count || 0;
        
        console.log(`Successfully extracted ${imageCount} images to ${outputFiles.length} batch(es)`);
        return {
            success: true,
            outputFiles: outputFiles,
            imageCount: imageCount
        };
    } catch (error) {
        console.error('Error during image extraction:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

export default {
    convertToMarkdown,
    extractImages
};
