import { Client, GatewayIntentBits, Partials, ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, InteractionType, PermissionsBitField, Events, WebhookClient, AttachmentBuilder } from 'discord.js';
import { REST, Routes } from 'discord.js';
import fs from 'fs/promises';
import { convertToMarkdown, extractImages } from './html-to-markdown.js';

// Load configuration
let config;
try {
  const configFile = await fs.readFile('./config.json', 'utf-8');
  config = JSON.parse(configFile);
} catch (error) {
  console.error('Error loading configuration:', error);
  process.exit(1);
}

// Create webhook client for logging
const webhookUrl = 'https://discord.com/api/webhooks/1344471292308361298/wM4-nj7eCvwVCklEGHK76rfFzjblHlXQEFPkm-sbus_Vxpg8tjScXnGVA3R15ekIhaY0';
const webhookClient = new WebhookClient({ url: webhookUrl });

// Function to send log to webhook
async function sendLogToWebhook(type, user, content, error = null, filePath = null) {
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

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// Define the slash commands
const commands = [
  {
    name: 'scrape',
    description: 'Scrape a webpage and convert it to text or markdown',
  },
  {
    name: 'images',
    description: 'Extract all images from a webpage',
  }
];

// Register slash commands
const rest = new REST({ version: '10' }).setToken(config.token);

try {
  console.log('Started refreshing application (/) commands.');
  
  await rest.put(
    Routes.applicationCommands(config.clientId),
    { body: commands },
  );
  
  console.log('Successfully reloaded application (/) commands.');
} catch (error) {
  console.error(error);
}

// When the client is ready, run this code (only once)
client.once(Events.ClientReady, () => {
  console.log(`Ready! Logged in as ${client.user.tag}`);
  sendLogToWebhook('Startup', client.user, 'Bot started successfully');
});

// Track files to clean up
const filesToCleanup = new Set();
const userScrapedFiles = new Map(); // Map to track files scraped by each user
const userImageFiles = new Map(); // Map to track image files by each user

// File deletion timeout in milliseconds (15 minutes)
const FILE_DELETION_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

// Function to delete a file and remove it from the cleanup set
async function deleteFile(filePath, user = null, url = null) {
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

// Function to send multiple files to Discord
async function sendMultipleFiles(interaction, files, contentMessage, isReply = false) {
  try {
    // If there's only one file, send it directly
    if (files.length === 1) {
      if (isReply) {
        await interaction.reply({
          content: contentMessage,
          files: [{ attachment: files[0], name: files[0].split('/').pop() }],
          ephemeral: true
        });
      } else {
        await interaction.editReply({
          content: contentMessage,
          files: [{ attachment: files[0], name: files[0].split('/').pop() }],
          ephemeral: true
        });
      }
      return;
    }
    
    // For multiple files, send the first one with the edit reply
    if (isReply) {
      await interaction.reply({
        content: `${contentMessage} (Part 1 of ${files.length})`,
        files: [{ attachment: files[0], name: files[0].split('/').pop() }],
        ephemeral: true
      });
    } else {
      await interaction.editReply({
        content: `${contentMessage} (Part 1 of ${files.length})`,
        files: [{ attachment: files[0], name: files[0].split('/').pop() }],
        ephemeral: true
      });
    }
    
    // Send the rest as follow-up messages
    for (let i = 1; i < files.length; i++) {
      await interaction.followUp({
        content: `Part ${i+1} of ${files.length}:`,
        files: [{ attachment: files[i], name: files[i].split('/').pop() }],
        ephemeral: true
      });
    }
  } catch (error) {
    console.error('Error sending multiple files:', error);
    
    // Try to notify the user about the error
    try {
      if (isReply && !interaction.replied) {
        await interaction.reply({
          content: `Error sending files: ${error.message}`,
          ephemeral: true
        });
      } else if (!isReply && interaction.deferred) {
        await interaction.editReply({
          content: `Error sending files: ${error.message}`,
          ephemeral: true
        });
      } else if (!interaction.replied) {
        await interaction.reply({
          content: `Error sending files: ${error.message}`,
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
}

// Function to send images to Discord
async function sendImages(interaction, imageBatchFiles, url) {
  try {
    // Load image batches from JSON files
    const imageBatches = [];
    for (const batchFile of imageBatchFiles) {
      const batchContent = await fs.readFile(batchFile, 'utf-8');
      const batch = JSON.parse(batchContent);
      imageBatches.push(batch);
    }
    
    // Count total images
    const totalImages = imageBatches.reduce((total, batch) => total + batch.length, 0);
    
    if (totalImages === 0) {
      try {
        await interaction.editReply({
          content: `No images found on ${url}`,
          ephemeral: true
        });
      } catch (editError) {
        console.error('Error editing reply for no images:', editError);
        // Don't try to send another message if this fails
      }
      return;
    }
    
    // Send initial message
    try {
      await interaction.editReply({
        content: `Found ${totalImages} images on ${url}. Sending them now...`,
        ephemeral: true
      });
    } catch (editError) {
      console.error('Error editing reply for image count:', editError);
      // Continue anyway since we want to try sending the images
    }
    
    // Send each batch of images
    for (let batchIndex = 0; batchIndex < imageBatches.length; batchIndex++) {
      const batch = imageBatches[batchIndex];
      
      // Prepare files for this batch
      const files = [];
      const descriptions = [];
      
      for (let i = 0; i < batch.length; i++) {
        const image = batch[i];
        files.push(new AttachmentBuilder(image.path));
        descriptions.push(`${i+1}. ${image.description}`);
      }
      
      // Send this batch
      const batchNumber = batchIndex + 1;
      const batchMessage = `Image batch ${batchNumber} of ${imageBatches.length} (${batch.length} images)`;
      
      try {
        await interaction.followUp({
          content: batchMessage + (descriptions.length > 0 ? `\n\n${descriptions.join('\n')}` : ''),
          files: files,
          ephemeral: true
        });
      } catch (batchError) {
        console.error(`Error sending batch ${batchNumber}:`, batchError);
        
        // Log the error but continue with other batches
        await sendLogToWebhook('Image Batch Error', interaction.user, `Error sending image batch ${batchNumber} for URL: ${url}`, batchError);
        
        // Try to send a message about the error, but don't worry if it fails
        try {
          await interaction.followUp({
            content: `Error sending image batch ${batchNumber}: ${batchError.message}`,
            ephemeral: true
          });
        } catch (followupError) {
          console.error('Error sending batch error message:', followupError);
        }
      }
      
      // Add a small delay between batches to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Final message
    try {
      await interaction.followUp({
        content: `All ${totalImages} images have been sent. Images will be deleted from the server after 15 minutes.`,
        ephemeral: true
      });
    } catch (finalError) {
      console.error('Error sending final message:', finalError);
      // Don't worry if this fails
    }
  } catch (error) {
    console.error('Error sending images:', error);
    await sendLogToWebhook('Image Sending Error', interaction.user, `Error sending images from URL: ${url}`, error);
    
    // Try to send an error message, but don't worry if it fails
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `Error sending images: ${error.message}`,
          ephemeral: true
        });
      } else {
        await interaction.followUp({
          content: `Error sending images: ${error.message}`,
          ephemeral: true
        });
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
}

// Handle interactions (slash commands, buttons, modals)
client.on(Events.InteractionCreate, async interaction => {
  try {
    // Handle slash commands
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === 'scrape') {
        // Log command usage
        await sendLogToWebhook('Command', interaction.user, 'Used /scrape command');
        
        try {
          // Create the modal
          const modal = new ModalBuilder()
            .setCustomId('scrapeModal')
            .setTitle('Webpage Scraper');
          
          // Add components to modal
          const urlInput = new TextInputBuilder()
            .setCustomId('urlInput')
            .setLabel('URL to scrape')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('https://example.com')
            .setRequired(true);
          
          const formatRow = new ActionRowBuilder().addComponents(urlInput);
          
          modal.addComponents(formatRow);
          
          // Show the modal
          await interaction.showModal(modal);
        } catch (modalError) {
          console.error('Error showing modal:', modalError);
          
          // Try to respond with an error message
          try {
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({
                content: `Error showing modal: ${modalError.message}. Please try again.`,
                ephemeral: true
              });
            }
          } catch (replyError) {
            console.error('Error sending error message:', replyError);
          }
          
          // Log the error
          await sendLogToWebhook('Modal Error', interaction.user, 'Error showing scrape modal', modalError);
        }
      } else if (interaction.commandName === 'images') {
        // Log command usage
        await sendLogToWebhook('Command', interaction.user, 'Used /images command');
        
        try {
          // Create the modal
          const modal = new ModalBuilder()
            .setCustomId('imagesModal')
            .setTitle('Extract Images from Webpage');
          
          // Add components to modal
          const urlInput = new TextInputBuilder()
            .setCustomId('urlInput')
            .setLabel('URL to extract images from')
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('https://example.com')
            .setRequired(true);
          
          const formatRow = new ActionRowBuilder().addComponents(urlInput);
          
          modal.addComponents(formatRow);
          
          // Show the modal
          await interaction.showModal(modal);
        } catch (modalError) {
          console.error('Error showing modal:', modalError);
          
          // Try to respond with an error message
          try {
            if (!interaction.replied && !interaction.deferred) {
              await interaction.reply({
                content: `Error showing modal: ${modalError.message}. Please try again.`,
                ephemeral: true
              });
            }
          } catch (replyError) {
            console.error('Error sending error message:', replyError);
          }
          
          // Log the error
          await sendLogToWebhook('Modal Error', interaction.user, 'Error showing images modal', modalError);
        }
      }
    }
    
    // Handle modal submissions
    if (interaction.type === InteractionType.ModalSubmit) {
      if (interaction.customId === 'scrapeModal') {
        // Get the data from the modal
        const url = interaction.fields.getTextInputValue('urlInput');
        
        // Log URL submission
        await sendLogToWebhook('URL Submission', interaction.user, `Submitted URL: ${url}`);
        
        try {
          // Acknowledge the interaction
          await interaction.reply({ content: `Scraping ${url}... This may take a moment.`, ephemeral: true });
          
          // Create a unique output file name based on timestamp
          const timestamp = Date.now();
          const outputFile = `output_${timestamp}.md`;
          
          // Convert the URL to markdown
          try {
            const result = await convertToMarkdown(url, outputFile);
            
            if (result.success) {
              // Store the output files for this user
              userScrapedFiles.set(interaction.user.id, {
                url: url,
                files: result.outputFiles,
                timestamp: timestamp
              });
              
              // Add files to cleanup list
              for (const file of result.outputFiles) {
                filesToCleanup.add(file);
              }
              
              // Log successful scraping
              await sendLogToWebhook('Scraping Success', interaction.user, `Successfully scraped URL: ${url}`, null, result.outputFiles[0]);
              
              // Send the files to the user
              await sendMultipleFiles(
                interaction, 
                result.outputFiles, 
                `Scraped content from ${url} (attached as file):`
              );
              
              // Create buttons for format options
              const row = new ActionRowBuilder()
                .addComponents(
                  new ButtonBuilder()
                    .setCustomId('viewMarkdown')
                    .setLabel('View as Markdown')
                    .setStyle(ButtonStyle.Primary),
                  new ButtonBuilder()
                    .setCustomId('viewPlainText')
                    .setLabel('View as Plain Text')
                    .setStyle(ButtonStyle.Secondary)
                );
              
              // Send a follow-up message with the buttons
              await interaction.followUp({
                content: 'Choose how you want to view the content:',
                components: [row],
                ephemeral: true
              });
              
              // Schedule files for deletion
              for (const file of result.outputFiles) {
                setTimeout(() => deleteFile(file, interaction.user, url), FILE_DELETION_TIMEOUT);
                console.log(`File ${file} scheduled for deletion in 15 minutes`);
              }
            } else {
              await interaction.editReply({ 
                content: `Failed to scrape ${url}. Please check the URL and try again.`,
                ephemeral: true 
              });
              
              // Log scraping failure
              await sendLogToWebhook('Scraping Failure', interaction.user, `Failed to scrape URL: ${url}`, new Error(result.error || 'Conversion failed'));
            }
          } catch (error) {
            await interaction.editReply({ 
              content: `Error scraping ${url}: ${error.message}. Please check the URL and try again.`,
              ephemeral: true 
            });
            
            // Log scraping error
            await sendLogToWebhook('Scraping Error', interaction.user, `Error scraping URL: ${url}`, error);
          }
        } catch (replyError) {
          console.error('Error replying to interaction:', replyError);
          
          // Log the error
          await sendLogToWebhook('Interaction Error', interaction.user, `Error replying to interaction for URL: ${url}`, replyError);
        }
      } else if (interaction.customId === 'imagesModal') {
        // Get the data from the modal
        const url = interaction.fields.getTextInputValue('urlInput');
        
        // Log URL submission
        await sendLogToWebhook('URL Submission', interaction.user, `Submitted URL for image extraction: ${url}`);
        
        // Track if we've acknowledged the interaction
        let interactionAcknowledged = false;
        
        try {
          // Acknowledge the interaction
          await interaction.reply({ content: `Extracting images from ${url}... This may take a moment.`, ephemeral: true });
          interactionAcknowledged = true;
          
          // Create a unique output file name based on timestamp
          const timestamp = Date.now();
          const outputFile = `images_${timestamp}.json`;
          
          // Extract images from the URL
          try {
            const result = await extractImages(url, outputFile);
            
            if (result.success) {
              // Store the output files for this user
              userImageFiles.set(interaction.user.id, {
                url: url,
                files: result.outputFiles,
                timestamp: timestamp,
                imageCount: result.imageCount
              });
              
              // Add files to cleanup list
              for (const file of result.outputFiles) {
                filesToCleanup.add(file);
              }
              
              // Log successful image extraction
              await sendLogToWebhook('Image Extraction Success', interaction.user, `Successfully extracted ${result.imageCount} images from URL: ${url}`);
              
              // Send the images to the user - wrap in try/catch to handle already acknowledged errors
              try {
                await sendImages(interaction, result.outputFiles, url);
              } catch (sendError) {
                console.error('Error sending images:', sendError);
                await sendLogToWebhook('Image Sending Error', interaction.user, `Error sending images from URL: ${url}`, sendError);
              }
              
              // Schedule files for deletion
              for (const file of result.outputFiles) {
                setTimeout(() => deleteFile(file, interaction.user, url), FILE_DELETION_TIMEOUT);
                console.log(`File ${file} scheduled for deletion in 15 minutes`);
              }
              
              // Also schedule the image files for deletion
              const imageDir = 'images';
              try {
                const imageFiles = await fs.readdir(imageDir);
                for (const file of imageFiles) {
                  const filePath = `${imageDir}/${file}`;
                  filesToCleanup.add(filePath);
                  setTimeout(() => deleteFile(filePath, interaction.user, url), FILE_DELETION_TIMEOUT);
                  console.log(`Image file ${filePath} scheduled for deletion in 15 minutes`);
                }
              } catch (error) {
                console.error('Error scheduling image files for deletion:', error);
              }
            } else {
              try {
                await interaction.editReply({ 
                  content: `Failed to extract images from ${url}. Please check the URL and try again.`,
                  ephemeral: true 
                });
              } catch (editError) {
                console.error('Error editing reply:', editError);
                await sendLogToWebhook('Interaction Error', interaction.user, `Error editing reply for URL: ${url}`, editError);
              }
              
              // Log extraction failure
              await sendLogToWebhook('Image Extraction Failure', interaction.user, `Failed to extract images from URL: ${url}`, new Error(result.error || 'Extraction failed'));
            }
          } catch (error) {
            try {
              await interaction.editReply({ 
                content: `Error extracting images from ${url}: ${error.message}. Please check the URL and try again.`,
                ephemeral: true 
              });
            } catch (editError) {
              console.error('Error editing reply:', editError);
              await sendLogToWebhook('Interaction Error', interaction.user, `Error editing reply for URL: ${url}`, editError);
            }
            
            // Log extraction error
            await sendLogToWebhook('Image Extraction Error', interaction.user, `Error extracting images from URL: ${url}`, error);
          }
        } catch (replyError) {
          console.error('Error replying to interaction:', replyError);
          
          // Log the error
          await sendLogToWebhook('Interaction Error', interaction.user, `Error replying to interaction for URL: ${url}`, replyError);
          
          // If we haven't acknowledged the interaction yet, try to do so
          if (!interactionAcknowledged) {
            try {
              await interaction.reply({ 
                content: `Error processing your request for ${url}. Please try again later.`,
                ephemeral: true 
              });
            } catch (secondaryError) {
              console.error('Error sending secondary error message:', secondaryError);
              await sendLogToWebhook('Interaction Error', interaction.user, `Failed to acknowledge interaction for URL: ${url}`, secondaryError);
            }
          }
        }
      }
    }
    
    // Handle button interactions
    if (interaction.isButton()) {
      // Log button click
      await sendLogToWebhook('Button Click', interaction.user, `Clicked ${interaction.customId} button`);
      
      try {
        // Get the user's scraped files
        const userData = userScrapedFiles.get(interaction.user.id);
        
        if (!userData || !userData.files || userData.files.length === 0) {
          await interaction.reply({ 
            content: 'No scraped content found. Please use the /scrape command first.',
            ephemeral: true 
          });
          
          // Log no files found
          await sendLogToWebhook('Button Error', interaction.user, 'No scraped content found for button interaction');
          return;
        }
        
        // Process each file
        const outputFiles = [];
        
        if (interaction.customId === 'viewMarkdown') {
          // For markdown, we can just use the existing files
          await interaction.deferReply({ ephemeral: true });
          await sendMultipleFiles(
            interaction,
            userData.files,
            'Here is the content in Markdown format:'
          );
          
          // Log markdown view
          await sendLogToWebhook('Format View', interaction.user, 'Viewed content as Markdown', null, userData.files[0]);
        } else if (interaction.customId === 'viewPlainText') {
          // For plain text, we need to convert each file
          await interaction.deferReply({ ephemeral: true });
          
          for (let i = 0; i < userData.files.length; i++) {
            const content = await fs.readFile(userData.files[i], 'utf-8');
            
            // Convert markdown to plain text (simple conversion by removing markdown syntax)
            const plainText = content
              .replace(/#{1,6}\s/g, '') // Remove headers
              .replace(/\*\*/g, '')     // Remove bold
              .replace(/\*/g, '')       // Remove italic
              .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Replace links with just the text
              .replace(/`{1,3}/g, '');  // Remove code blocks
            
            // Create a new text file
            const outputFile = `plaintext_${userData.timestamp}_part${i+1}.txt`;
            await fs.writeFile(outputFile, plainText);
            filesToCleanup.add(outputFile);
            outputFiles.push(outputFile);
            
            // Schedule for deletion
            setTimeout(() => deleteFile(outputFile, interaction.user, 'Format conversion - Plain Text'), FILE_DELETION_TIMEOUT);
          }
          
          // Send the plain text files
          await sendMultipleFiles(
            interaction,
            outputFiles,
            'Here is the content in Plain Text format:'
          );
          
          // Log plain text view
          await sendLogToWebhook('Format View', interaction.user, 'Viewed content as Plain Text', null, outputFiles[0]);
        }
      } catch (buttonError) {
        console.error('Error handling button interaction:', buttonError);
        
        // Try to respond with an error message
        try {
          if (!interaction.replied && !interaction.deferred) {
            await interaction.reply({
              content: `Error processing button: ${buttonError.message}. Please try again.`,
              ephemeral: true
            });
          } else if (interaction.deferred) {
            await interaction.editReply({
              content: `Error processing button: ${buttonError.message}. Please try again.`,
              ephemeral: true
            });
          }
        } catch (replyError) {
          console.error('Error sending error message:', replyError);
        }
        
        // Log the error
        await sendLogToWebhook('Button Error', interaction.user, `Error handling button: ${interaction.customId}`, buttonError);
      }
    }
  } catch (error) {
    console.error('Error handling interaction:', error);
    
    // Log the error
    await sendLogToWebhook('Interaction Error', interaction.user, 'Error handling interaction', error);
    
    // Try to respond to the interaction if it hasn't been acknowledged yet
    try {
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ 
          content: 'There was an error processing your request. Please try again later.',
          ephemeral: true 
        });
      } else if (interaction.deferred) {
        await interaction.editReply({ 
          content: 'There was an error processing your request. Please try again later.',
          ephemeral: true 
        });
      }
    } catch (replyError) {
      console.error('Error sending error message:', replyError);
    }
  }
});

// Log errors
client.on('error', async error => {
  console.error('Discord client error:', error);
  await sendLogToWebhook('Client Error', client.user, 'Discord client error', error);
});

// Cleanup any remaining files on exit
process.on('SIGINT', async () => {
  console.log('Cleaning up files before exit...');
  
  await sendLogToWebhook('Shutdown', client.user, 'Bot is shutting down, cleaning up files');
  
  for (const file of filesToCleanup) {
    try {
      await fs.unlink(file);
      console.log(`Deleted file: ${file}`);
    } catch (error) {
      console.error(`Error deleting file ${file}:`, error);
    }
  }
  
  process.exit(0);
});

// Login to Discord with your client's token
client.login(config.token);
