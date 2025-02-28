import fs from 'fs/promises';

async function main() {
  try {
    // Create sample leaderboard data
    const leaderboardData = {
      "123456789": {
        "username": "TestUser1",
        "avatarURL": "https://cdn.discordapp.com/avatars/123456789/abcdef.png",
        "pagesScraped": 5,
        "lastScrapedUrl": "https://example.com",
        "lastScrapedAt": new Date().toISOString()
      },
      "987654321": {
        "username": "TestUser2",
        "avatarURL": "https://cdn.discordapp.com/avatars/987654321/fedcba.png",
        "pagesScraped": 3,
        "lastScrapedUrl": "https://example.org",
        "lastScrapedAt": new Date().toISOString()
      }
    };
    
    // Write to leaderboard.json
    console.log('Writing test data to leaderboard.json');
    await fs.writeFile('leaderboard.json', JSON.stringify(leaderboardData, null, 2));
    console.log('Test data written successfully');
    
    // Read back to verify
    const data = await fs.readFile('leaderboard.json', 'utf-8');
    console.log('Leaderboard data read back:', data);
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
