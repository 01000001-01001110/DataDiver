# Discord Webpage Scraper Bot

A Discord bot that scrapes webpages and converts them to Markdown or extracts images.

## Features

- `/scrape` command to convert webpages to Markdown or plain text
- `/images` command to extract all images from a webpage
- `/leaderboard` command to view top users by pages scraped
- `/help` command for detailed instructions

## Docker Setup

This project is containerized using Docker, making it easy to deploy and run in any environment.

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Configuration

1. Update the `config.json` file with your Discord bot token and client ID:

```json
{
  "token": "YOUR_DISCORD_BOT_TOKEN",
  "clientId": "YOUR_DISCORD_CLIENT_ID"
}
```

### Running with Docker Compose

1. Build and start the container:

```bash
docker-compose up -d
```

2. View logs:

```bash
docker-compose logs -f
```

3. Stop the container:

```bash
docker-compose down
```

### Data Persistence

The following data is persisted through Docker volumes:

- `leaderboard.json`: User statistics and leaderboard data
- `images/`: Directory for temporarily storing extracted images
- `config.json`: Bot configuration file

## Manual Setup (Without Docker)

### Prerequisites

- Node.js v16.9.0 or higher
- Python 3.6 or higher
- Chrome Browser (for Selenium)

### Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd discord-bot-scraper
```

2. Install Node.js dependencies:

```bash
npm install
```

3. Install Python dependencies:

```bash
pip install -r requirements.txt
```

4. Update the `config.json` file with your Discord bot token and client ID.

5. Start the bot:

```bash
npm start
```

## Usage

1. Invite the bot to your Discord server using the OAuth2 URL generator in the Discord Developer Portal.

2. Use the following slash commands:
   - `/scrape`: Convert a webpage to Markdown or plain text
   - `/images`: Extract all images from a webpage
   - `/leaderboard`: View the top users by number of pages scraped
   - `/help`: Show help information about the bot and its commands

## Architecture

The bot uses a hybrid architecture:
- Node.js with Discord.js for the Discord interface
- Python with Selenium, BeautifulSoup, and html2text for web scraping and conversion

## License

[MIT License](LICENSE)
