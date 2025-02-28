# Technical Context: Discord Webpage Scraper Bot

## Technologies Used

### Node.js Components

1. **Discord.js (v14.14.1)**:
   - Core library for Discord API integration
   - Handles slash commands, modals, buttons, and message interactions
   - Manages the bot's lifecycle and event handling

2. **Node.js Core Modules**:
   - `fs/promises`: For file system operations
   - `child_process`: For executing the Python script
   - `util.promisify`: For converting callback-based functions to Promise-based
   - `path`: For handling file paths

### Python Components

1. **BeautifulSoup4 (v4.12.2)**:
   - HTML parsing and manipulation
   - Used to clean and extract content from HTML

2. **html2text (v2020.1.16)**:
   - Converts HTML to Markdown
   - Handles various HTML elements like headers, lists, tables, etc.

3. **Selenium (v4.15.2)**:
   - Browser automation for fetching web pages
   - Handles JavaScript-rendered content
   - Uses headless Chrome for rendering

4. **Requests (v2.31.0)**:
   - HTTP library for Python
   - Used for simple HTTP requests when Selenium is not needed

### Data Storage

1. **JSON Files**:
   - Used for persistent storage of user statistics
   - Simple file-based approach for data that needs to survive bot restarts
   - Leaderboard data is stored in a JSON file with user IDs as keys

### Other Dependencies

1. **Chrome Browser**:
   - Required for Selenium WebDriver
   - Used in headless mode for rendering web pages

## Development Setup

### Prerequisites

1. **Node.js Environment**:
   - Node.js v16.9.0 or higher
   - npm for package management

2. **Python Environment**:
   - Python 3.6 or higher
   - pip for package management

3. **Chrome Browser**:
   - Latest stable version recommended
   - ChromeDriver compatible with the installed Chrome version

### Installation Steps

1. **Clone the Repository**:
   ```bash
   git clone <repository-url>
   cd discord-bot-scraper
   ```

2. **Install Node.js Dependencies**:
   ```bash
   npm install
   ```

3. **Install Python Dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure the Bot**:
   - Create a Discord application and bot
   - Update `config.json` with the bot token and client ID

5. **Run the Bot**:
   ```bash
   npm start
   ```

## Project Structure

The project follows a modular structure with clear separation of concerns:

```
discord-bot-scraper/
├── src/                      # Source code directory
│   ├── bot.js                # Main bot entry point
│   ├── commands/             # Command handlers
│   │   ├── scrape-command.js # Scrape command implementation
│   │   ├── images-command.js # Images command implementation
│   │   └── leaderboard-command.js # Leaderboard command implementation
│   ├── handlers/             # Event handlers
│   │   ├── interaction-handler.js # Handles all Discord interactions
│   │   └── button-handler.js # Handles button interactions
│   └── utils/                # Utility modules
│       ├── config.js         # Configuration loader
│       ├── converter.js      # HTML to Markdown conversion
│       ├── file-manager.js   # File management utilities
│       ├── leaderboard.js    # Leaderboard data management
│       ├── logger.js         # Logging utilities
│       ├── message-sender.js # Message sending utilities
│       └── user-data.js      # User data management
├── convert.py                # Python script for HTML conversion
├── index.js                  # Application entry point
├── config.json               # Bot configuration
├── package.json              # Node.js dependencies
└── requirements.txt          # Python dependencies
```

## Technical Constraints

### Discord API Limitations

1. **Message Size Limits**:
   - Discord messages are limited to 2000 characters
   - For longer content, files must be used (max 8MB for regular users, 50MB for Nitro)

2. **Rate Limits**:
   - Discord API has rate limits that must be respected
   - Interactions must be acknowledged within 3 seconds

3. **Slash Command Limitations**:
   - Limited number of options and sub-commands
   - Command names and descriptions have character limits

4. **Embed Limitations**:
   - Embeds have field limits (25 fields maximum)
   - Total embed content has character limits
   - Used for leaderboard display with potential pagination needed for large servers

### Web Scraping Challenges

1. **JavaScript-Heavy Websites**:
   - Some websites rely heavily on JavaScript for content rendering
   - Selenium is used to handle this, but it's more resource-intensive

2. **Anti-Scraping Measures**:
   - Some websites implement measures to prevent scraping
   - May require additional handling for CAPTCHAs, IP blocking, etc.

3. **Content Structure Variability**:
   - Websites have widely varying HTML structures
   - The conversion process must be robust to handle different layouts

### Resource Constraints

1. **Memory Usage**:
   - Selenium and Chrome can be memory-intensive
   - Large webpages may require significant memory for processing

2. **Processing Time**:
   - Complex webpages may take time to render and process
   - Discord interactions have timeout limits that must be considered

3. **Storage Requirements**:
   - Scraped content is stored in files
   - No database is used, limiting scalability for high-volume usage
   - Leaderboard data is stored in a JSON file, which may have concurrency issues with many simultaneous users

### Data Persistence Challenges

1. **File-Based Storage Limitations**:
   - JSON files are used for data persistence
   - No transaction support or concurrency control
   - Potential for data corruption if the process is terminated unexpectedly

2. **User Data Management**:
   - User statistics need to persist across bot restarts
   - Discord user information (username, avatar) may change over time

## Performance Considerations

1. **Optimization Strategies**:
   - Use Selenium only when necessary (for JavaScript-rendered content)
   - Implement caching for frequently accessed pages
   - Optimize HTML parsing and conversion for speed
   - Minimize file I/O operations for leaderboard updates

2. **Scalability Factors**:
   - The current architecture is suitable for moderate usage
   - For high-volume scenarios, consider implementing a queue system
   - Database storage may be needed for persistent caching and user statistics in larger deployments

3. **Error Handling**:
   - Robust error handling is implemented throughout the application
   - Timeouts are set for web requests to prevent hanging
   - Users are provided with clear error messages
   - Data corruption prevention measures for leaderboard data

4. **Concurrency Handling**:
   - Simple file locking mechanism for leaderboard updates
   - In-memory caching to reduce file I/O operations
   - Atomic file write operations where possible
