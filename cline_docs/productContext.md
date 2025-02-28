# Product Context: Discord Webpage Scraper Bot

## Why This Project Exists

This project exists to provide Discord users with a convenient way to extract and share content from webpages directly within Discord. It addresses the need to reference, share, and archive web content in a format that's easily consumable within the Discord platform.

## Problems It Solves

1. **Content Sharing**: Users often need to share information from websites in Discord conversations, but copying and pasting can result in formatting issues or excessive content.

2. **Content Preservation**: Web content can change or disappear over time. This bot allows users to create a snapshot of a webpage's content for reference or archival purposes.

3. **Format Conversion**: HTML content from websites isn't always easy to read in Discord. Converting to Markdown or plain text makes the content more readable and compatible with Discord's formatting.

4. **Accessibility**: Some websites may be difficult to access for certain users due to regional restrictions, paywalls, or other limitations. The bot can help retrieve and share this content.

5. **Information Extraction**: Users may only need the textual content from a webpage without images, ads, or other distractions. The bot filters out these elements to provide clean, readable text.

6. **Image Collection**: Users may want to extract and save images from webpages without having to download each one manually. The bot can extract all images from a webpage and provide them in an organized manner.

7. **Community Engagement**: The leaderboard feature encourages user engagement and creates a sense of community by tracking and displaying user activity.

## How It Should Work

1. **Text Scraping**:
   - Users trigger the bot using the `/scrape` slash command in any Discord channel where the bot has access.
   - A modal dialog appears, prompting the user to enter the URL of the webpage they want to scrape.
   - The bot fetches the webpage content, handling JavaScript rendering if necessary, and converts the HTML to Markdown format.
   - For shorter content, the bot displays it directly in Discord using code blocks
   - For longer content, the bot attaches a file containing the scraped content
   - The bot provides buttons for users to choose between Markdown and plain text formats

2. **Image Extraction**:
   - Users trigger the bot using the `/images` slash command.
   - A modal dialog appears, prompting the user to enter the URL of the webpage they want to extract images from.
   - The bot fetches the webpage, extracts all images, and downloads them.
   - The bot sends the images to the user in Discord, with descriptions where available.
   - For webpages with many images, the bot organizes them into batches for easier viewing.

3. **Leaderboard System**:
   - Users can view the leaderboard using the `/leaderboard` slash command.
   - The leaderboard displays the top users by number of pages scraped.
   - Each entry shows the user's Discord username, avatar, number of pages scraped, and last activity time.
   - The system tracks user activity across both the `/scrape` and `/images` commands.
   - User statistics persist across bot restarts, providing a long-term record of activity.

4. **User Experience**:
   - The process should be simple and intuitive
   - The bot should provide clear feedback about the status of operations
   - The output should be well-formatted and readable
   - All interactions should be ephemeral to avoid cluttering the channel
   - The leaderboard should be visually appealing and easy to understand

5. **Technical Operation**:
   - The bot uses Selenium to handle JavaScript-rendered websites
   - BeautifulSoup and html2text process and clean the HTML
   - The content is saved to files for reference and sharing
   - User statistics are stored in a persistent JSON file
   - The bot handles errors gracefully and provides helpful error messages

## Key Features

1. **Webpage Content Extraction**:
   - Converts HTML to Markdown or plain text
   - Handles JavaScript-rendered websites
   - Preserves important formatting elements
   - Removes ads, scripts, and other unwanted elements
   - Splits large content into multiple files if necessary

2. **Image Extraction**:
   - Extracts all images from a webpage
   - Downloads and organizes images
   - Preserves image descriptions from alt text or title attributes
   - Handles various image formats (JPEG, PNG, GIF, SVG, etc.)
   - Sends images directly to Discord

3. **User Statistics and Leaderboard**:
   - Tracks user activity across commands
   - Displays top users by pages scraped
   - Shows user avatars and usernames
   - Includes timestamps for last activity
   - Persists data across bot restarts

4. **User Interface**:
   - Slash commands for easy access
   - Modal dialogs for URL input
   - Buttons for format selection
   - Ephemeral messages for clean channel experience
   - Clear error messages and status updates

5. **File Management**:
   - Automatic file cleanup after use
   - Proper file organization
   - Efficient storage and retrieval
   - Handles large files appropriately
