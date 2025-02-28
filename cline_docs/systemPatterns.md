# System Patterns: Discord Webpage Scraper Bot

## How the System is Built

The Discord Webpage Scraper Bot is built using a hybrid architecture that combines Node.js and Python components:

1. **Discord Interface Layer (Node.js)**:
   - Handles all Discord API interactions using Discord.js
   - Manages slash commands, modals, buttons, and message responses
   - Coordinates the overall flow of the application

2. **Scraping and Conversion Layer (Python)**:
   - Handles the actual webpage scraping using Selenium
   - Processes HTML content using BeautifulSoup
   - Converts HTML to Markdown using html2text
   - Cleans and formats the output

3. **Integration Layer**:
   - Node.js wrapper (html-to-markdown.js) that calls the Python script
   - Passes parameters and receives results via command-line execution
   - Handles file I/O for storing and retrieving scraped content

4. **Data Persistence Layer**:
   - Manages user statistics and leaderboard data
   - Stores data in JSON files for persistence across bot restarts
   - Provides an API for recording and retrieving user activity

## Key Technical Decisions

1. **Hybrid Language Approach**:
   - **Decision**: Use both Node.js and Python instead of a single language
   - **Rationale**: Leverages the strengths of both ecosystems - Discord.js for Discord integration and Python's robust web scraping libraries
   - **Trade-offs**: Adds complexity in deployment and maintenance, but provides better functionality

2. **Selenium for Web Scraping**:
   - **Decision**: Use Selenium with headless Chrome for scraping
   - **Rationale**: Allows handling of JavaScript-rendered websites, which is essential for modern web applications
   - **Trade-offs**: More resource-intensive than simple HTTP requests, but necessary for complete content extraction

3. **File-Based Content Storage**:
   - **Decision**: Store scraped content in files rather than a database
   - **Rationale**: Simplifies implementation and allows direct file attachment in Discord
   - **Trade-offs**: Limited scalability, but sufficient for expected usage patterns

4. **Ephemeral Interactions**:
   - **Decision**: Make all bot interactions ephemeral (only visible to the user who triggered them)
   - **Rationale**: Prevents channel clutter and respects privacy
   - **Trade-offs**: Limits collaboration possibilities, but aligns with the primary use case

5. **Format Options**:
   - **Decision**: Provide both Markdown and Plain Text output options
   - **Rationale**: Different use cases require different formats
   - **Trade-offs**: Adds complexity, but significantly improves user experience

6. **Modular Code Structure**:
   - **Decision**: Organize code into modules by functionality
   - **Rationale**: Improves maintainability, testability, and separation of concerns
   - **Trade-offs**: Requires more initial setup, but pays off in long-term maintenance

7. **JSON-Based Persistence**:
   - **Decision**: Use JSON files for data persistence instead of a database
   - **Rationale**: Simplifies deployment and reduces dependencies
   - **Trade-offs**: Limited query capabilities and potential concurrency issues, but sufficient for the current scale

## Architecture Patterns

1. **Command Pattern**:
   - Used for implementing the slash command and button interactions
   - Each command is self-contained with its own handling logic

2. **Adapter Pattern**:
   - The Node.js wrapper acts as an adapter between the Discord interface and the Python scraping functionality
   - Translates between different interfaces and data formats

3. **Factory Pattern**:
   - Used in the conversion process to create different output formats (Markdown or Plain Text)
   - Centralizes the creation logic for different output types

4. **Pipeline Pattern**:
   - The scraping and conversion process follows a pipeline pattern:
     1. Fetch HTML content
     2. Parse and clean HTML
     3. Convert to Markdown
     4. Format and deliver output
   - Each stage has a specific responsibility and passes its output to the next stage

5. **Event-Driven Architecture**:
   - The Discord bot operates on an event-driven model
   - Different types of interactions (commands, modals, buttons) trigger specific event handlers

6. **Repository Pattern**:
   - Used for the leaderboard system to abstract data access
   - Provides methods for storing and retrieving user statistics
   - Isolates the data storage implementation from the business logic

7. **Module Pattern**:
   - Code is organized into modules by functionality
   - Each module exports a specific set of functions or classes
   - Promotes encapsulation and separation of concerns

## Data Flow

### Scraping Flow
1. User initiates `/scrape` command in Discord
2. Discord sends an interaction event to the bot
3. Bot displays a modal for URL input
4. User submits URL through the modal
5. Bot calls the conversion function with the URL
6. Conversion function executes the Python script
7. Python script fetches the webpage using Selenium
8. Python script processes and converts the HTML
9. Python script saves the result to a file
10. Bot reads the file and sends the content back to Discord
11. User selects desired format using buttons
12. Bot delivers the content in the selected format
13. Bot records the user's activity in the leaderboard system

### Image Extraction Flow
1. User initiates `/images` command in Discord
2. Discord sends an interaction event to the bot
3. Bot displays a modal for URL input
4. User submits URL through the modal
5. Bot calls the image extraction function with the URL
6. Extraction function executes the Python script
7. Python script fetches the webpage using Selenium
8. Python script extracts images from the HTML
9. Python script downloads the images and saves metadata to a file
10. Bot reads the metadata and sends the images back to Discord
11. Bot records the user's activity in the leaderboard system

### Leaderboard Flow
1. User initiates `/leaderboard` command in Discord
2. Discord sends an interaction event to the bot
3. Bot retrieves the leaderboard data from the persistence layer
4. Bot formats the data into a Discord embed
5. Bot sends the embed back to Discord
6. User views the leaderboard with top users and their statistics
